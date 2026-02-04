/**
 * Publish Scheduled Posts - Edge Function
 *
 * This function checks for scheduled posts that are due and publishes
 * them to Nostr relays using WebSocket (the standard Nostr protocol).
 *
 * The events are already pre-signed by the user, so we only need to
 * transport them to the relays - no private keys needed on backend.
 */

const BATCH_SIZE = 25; // Process up to 25 posts at a time
const MAX_WORKERS = 5; // Maximum number of concurrent workers
const RELAY_TIMEOUT = 10000; // 10 seconds timeout for relay connections

module.exports = async function(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // createClient is injected by the InsForge worker template
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_INTERNAL_URL') || 'http://insforge:7130',
      anonKey: Deno.env.get('ANON_KEY')
    });

    const now = new Date().toISOString();
    console.log(`Checking for scheduled posts at ${now}`);

    // Get pending posts that are scheduled for now or earlier
    const { data: pendingPosts, error: fetchError } = await client.database
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch scheduled posts',
        details: fetchError
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingPosts?.length || 0} pending posts to process`);

    if (!pendingPosts || pendingPosts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending posts to process',
        processed: 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process posts in parallel with controlled concurrency
    const results = await processPostsInBatches(client, pendingPosts);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Processing complete: ${successCount} successful, ${failCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Processing complete',
      total: pendingPosts.length,
      successful: successCount,
      failed: failCount,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in publish-scheduled-posts:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Process posts in batches with controlled concurrency
 */
async function processPostsInBatches(client, posts) {
  const results = [];

  // Process posts in chunks to control concurrency
  for (let i = 0; i < posts.length; i += MAX_WORKERS) {
    const batch = posts.slice(i, i + MAX_WORKERS);
    const batchPromises = batch.map(post => processPost(client, post));
    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch processing error:', result.reason);
        results.push({ success: false, error: result.reason?.message || 'Unknown error' });
      }
    }
  }

  return results;
}

/**
 * Process a single scheduled post
 */
async function processPost(client, post) {
  console.log(`Processing post ID: ${post.id}, scheduled for: ${post.scheduled_for}`);

  try {
    // Parse the signed event
    if (!post.signed_event) {
      const errorMessage = 'Signed event is null';
      console.error(errorMessage);
      await updatePostStatus(client, post.id, 'failed', errorMessage);
      return { success: false, postId: post.id, error: errorMessage };
    }

    let event;
    try {
      event = typeof post.signed_event === 'string'
        ? JSON.parse(post.signed_event)
        : post.signed_event;
    } catch (parseError) {
      const errorMessage = `Failed to parse signed event: ${parseError.message}`;
      console.error(errorMessage);
      await updatePostStatus(client, post.id, 'failed', errorMessage);
      return { success: false, postId: post.id, error: errorMessage };
    }

    // Parse the relays array
    const relayUrls = typeof post.relays === 'string'
      ? JSON.parse(post.relays)
      : post.relays;

    // Send the event to all specified relays
    let successCount = 0;
    let lastError = null;

    const relayPromises = relayUrls.map(async (relayURL) => {
      try {
        console.log(`Sending post ${post.id} to relay: ${relayURL}`);
        await publishToRelay(relayURL, event);
        console.log(`Successfully published post ${post.id} to relay ${relayURL}`);
        return { success: true, relay: relayURL };
      } catch (error) {
        console.error(`Failed to publish to relay ${relayURL}:`, error);
        lastError = error;
        return { success: false, relay: relayURL, error: error.message };
      }
    });

    const relayResults = await Promise.allSettled(relayPromises);

    // Count successful publications
    for (const result of relayResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      }
    }

    const now = new Date().toISOString();

    if (successCount > 0) {
      console.log(`Post ${post.id} published successfully to ${successCount}/${relayUrls.length} relays`);

      let errorMessage = null;
      if (lastError && successCount < relayUrls.length) {
        errorMessage = `Partially published (${successCount}/${relayUrls.length} relays). Last error: ${lastError.message}`;
      }

      // Update as published
      await client.database
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: now,
          error_message: errorMessage,
        })
        .eq('id', post.id);

      return {
        success: true,
        postId: post.id,
        kind: event.kind,
        publishedToRelays: successCount,
        totalRelays: relayUrls.length,
        partialError: errorMessage,
      };
    }

    // All relays failed
    const errorMessage = `Failed to publish to any relay. Last error: ${lastError?.message || 'Unknown error'}`;
    console.error(errorMessage);
    await updatePostStatus(client, post.id, 'failed', errorMessage);
    return { success: false, postId: post.id, error: errorMessage };

  } catch (error) {
    console.error(`Error processing post ${post.id}:`, error);
    const errorMessage = `Processing error: ${error.message}`;
    await updatePostStatus(client, post.id, 'failed', errorMessage);
    return { success: false, postId: post.id, error: errorMessage };
  }
}

/**
 * Update post status in database
 */
async function updatePostStatus(client, postId, status, errorMessage) {
  const now = new Date().toISOString();

  const updateData = {
    status: status,
    error_message: errorMessage,
  };

  if (status === 'published') {
    updateData.published_at = now;
  }

  await client.database
    .from('scheduled_posts')
    .update(updateData)
    .eq('id', postId);

  console.log(`Updated post ${postId} status to ${status}`);
}

/**
 * Publish a Nostr event to a relay using WebSocket
 * This is the standard Nostr protocol (NIP-01)
 */
async function publishToRelay(relayURL, event) {
  return new Promise((resolve, reject) => {
    // Ensure the URL has the correct protocol
    let wsUrl = relayURL;
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    }

    const ws = new WebSocket(wsUrl);
    let timeoutId;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    const resolveOnce = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve();
    };

    const rejectOnce = (error) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(error);
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      rejectOnce(new Error(`Timeout connecting to relay ${relayURL}`));
    }, RELAY_TIMEOUT);

    ws.onopen = () => {
      // Send the EVENT message (NIP-01)
      const message = JSON.stringify(['EVENT', event]);
      ws.send(message);
    };

    ws.onmessage = (msg) => {
      try {
        const message = JSON.parse(msg.data);

        // Handle OK response for EVENT (NIP-01)
        if (message[0] === 'OK') {
          const eventId = message[1];
          const success = message[2];
          const errorMessage = message[3];

          if (success) {
            console.log(`Relay ${relayURL} accepted event ${eventId}`);
            resolveOnce();
          } else {
            rejectOnce(new Error(`Relay rejected event: ${errorMessage}`));
          }
        }
      } catch (parseError) {
        console.warn(`Could not parse message from relay ${relayURL}:`, parseError);
      }
    };

    ws.onerror = (error) => {
      rejectOnce(new Error(`WebSocket error for relay ${relayURL}`));
    };

    ws.onclose = (event) => {
      if (!resolved) {
        if (event.code === 1000) {
          // Normal closure - assume success if we sent the event
          resolveOnce();
        } else {
          rejectOnce(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
        }
      }
    };
  });
}
