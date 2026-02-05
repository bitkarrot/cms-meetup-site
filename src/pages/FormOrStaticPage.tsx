import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDefaultRelay } from '@/hooks/useDefaultRelay';
import StaticPage from './StaticPage';
import FormPage from './FormPage';
import { PageLoadingIndicator } from '@/components/PageLoadingIndicator';

/**
 * This component checks if a path has a linked form (kind 30168 with linked-path tag)
 * before falling back to static page content (kind 34128).
 */
export default function FormOrStaticPage({ pathOverride }: { pathOverride?: string }) {
  const { path } = useParams<{ path: string }>();
  const { nostr: defaultRelay } = useDefaultRelay();

  const fullPath = pathOverride || `/${path}`;

  // Check if there's a form linked to this path
  const { data: linkedForm, isLoading } = useQuery({
    queryKey: ['linked-form-check', fullPath],
    queryFn: async () => {
      const signal = AbortSignal.timeout(3000);

      // Query for forms with this linked-path
      const unslashedPath = fullPath.startsWith('/') ? fullPath.slice(1) : fullPath;
      const slashedPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;

      const events = await defaultRelay.query(
        [{ kinds: [30168], '#linked-path': [slashedPath, unslashedPath] }],
        { signal }
      );

      if (events.length > 0) {
        // Get the most recent form
        const event = events.sort((a, b) => b.created_at - a.created_at)[0];
        const dTag = event.tags.find(([name]) => name === 'd')?.[1];
        return {
          found: true,
          formId: dTag || event.id,
          eventId: event.id,
          pubkey: event.pubkey,
        };
      }

      return { found: false };
    },
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading) {
    return <PageLoadingIndicator />;
  }

  // If a linked form is found, render the form
  if (linkedForm?.found && linkedForm.formId) {
    // We'll render an embedded form component
    return <EmbeddedForm formId={linkedForm.formId} pubkey={linkedForm.pubkey} />;
  }

  // Otherwise, fall back to static page
  return <StaticPage pathOverride={pathOverride} />;
}

// Embedded form component for linked forms
import { useState, useEffect, useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginArea } from '@/components/auth/LoginArea';
import Navigation from '@/components/Navigation';
import { ClipboardList, Send, Check, AlertCircle, User } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';

// Form field types
type FieldType =
  | 'shortText'
  | 'paragraph'
  | 'number'
  | 'singleChoice'
  | 'multipleChoice'
  | 'email'
  | 'url'
  | 'date'
  | 'label';

interface FieldChoice {
  id: string;
  label: string;
}

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  description?: string;
  choices?: FieldChoice[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface FormData {
  name: string;
  description?: string;
  fields: FormField[];
  settings: Record<string, unknown>;
}

// Field renderer
function EmbeddedFieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
}) {
  const inputClassName = `w-full ${error ? 'border-red-500' : ''}`;

  switch (field.type) {
    case 'shortText':
      return (
        <Input
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className={inputClassName}
        />
      );

    case 'paragraph':
      return (
        <Textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className={`min-h-[100px] ${inputClassName}`}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          min={field.min}
          max={field.max}
          className={inputClassName}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'email@example.com'}
          className={inputClassName}
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://example.com'}
          className={inputClassName}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      );

    case 'singleChoice':
      return (
        <RadioGroup
          value={value as string}
          onValueChange={onChange}
          className="space-y-2"
        >
          {field.choices?.map((choice) => (
            <div key={choice.id} className="flex items-center space-x-2">
              <RadioGroupItem value={choice.id} id={`${field.id}-${choice.id}`} />
              <Label htmlFor={`${field.id}-${choice.id}`} className="cursor-pointer">
                {choice.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case 'multipleChoice': {
      const selectedChoices = (value as string[]) || [];
      return (
        <div className="space-y-2">
          {field.choices?.map((choice) => (
            <div key={choice.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${choice.id}`}
                checked={selectedChoices.includes(choice.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedChoices, choice.id]);
                  } else {
                    onChange(selectedChoices.filter((id) => id !== choice.id));
                  }
                }}
              />
              <Label htmlFor={`${field.id}-${choice.id}`} className="cursor-pointer">
                {choice.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case 'label':
      return null;

    default:
      return (
        <Input
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      );
  }
}

// Form Author Badge
function EmbeddedFormAuthorBadge({ pubkey }: { pubkey: string }) {
  const { data: authorData } = useAuthor(pubkey);
  const metadata = authorData?.metadata;
  const displayName = metadata?.name || metadata?.display_name || `${pubkey.slice(0, 8)}...`;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <User className="h-4 w-4" />
      <span>Created by {displayName}</span>
    </div>
  );
}

function EmbeddedForm({ formId, pubkey }: { formId: string; pubkey: string }) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch form
  const { data: formEvent, isLoading, error } = useQuery({
    queryKey: ['embedded-form', formId, pubkey],
    queryFn: async () => {
      const signal = AbortSignal.timeout(10000);

      const filter = {
        kinds: [30168],
        '#d': [formId],
        authors: [pubkey],
      };

      const events = await nostr.query([filter], { signal });

      if (events.length === 0) {
        throw new Error('Form not found');
      }

      const event = events.sort((a, b) => b.created_at - a.created_at)[0];

      let formData: FormData;
      try {
        formData = JSON.parse(event.content);
      } catch {
        throw new Error('Invalid form data');
      }

      const relayTags = event.tags
        .filter(([name]) => name === 'relay')
        .map(([, url]) => url);

      return {
        id: formId,
        eventId: event.id,
        pubkey: event.pubkey,
        formData,
        created_at: event.created_at,
        relays: relayTags,
      };
    },
  });

  // Initialize responses
  useEffect(() => {
    if (formEvent?.formData.fields) {
      const initialResponses: Record<string, string | string[]> = {};
      formEvent.formData.fields.forEach((field) => {
        if (field.type === 'multipleChoice') {
          initialResponses[field.id] = [];
        } else if (field.type !== 'label') {
          initialResponses[field.id] = '';
        }
      });
      setResponses(initialResponses);
    }
  }, [formEvent]);

  // Validate form
  const validateForm = (): boolean => {
    if (!formEvent) return false;

    const newErrors: Record<string, string> = {};

    formEvent.formData.fields.forEach((field) => {
      if (field.type === 'label') return;

      const value = responses[field.id];

      if (field.required) {
        if (field.type === 'multipleChoice') {
          if (!value || (value as string[]).length === 0) {
            newErrors[field.id] = 'This field is required';
          }
        } else if (!value || (value as string).trim() === '') {
          newErrors[field.id] = 'This field is required';
        }
      }

      if (field.type === 'email' && value && (value as string).trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value as string)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }

      if (field.type === 'url' && value && (value as string).trim()) {
        try {
          new URL(value as string);
        } catch {
          newErrors[field.id] = 'Please enter a valid URL';
        }
      }

      if (field.type === 'number' && value && (value as string).trim()) {
        const num = Number(value);
        if (isNaN(num)) {
          newErrors[field.id] = 'Please enter a valid number';
        } else {
          if (field.min !== undefined && num < field.min) {
            newErrors[field.id] = `Value must be at least ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            newErrors[field.id] = `Value must be at most ${field.max}`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formEvent || !user) {
      toast({
        title: 'Error',
        description: 'Please log in to submit the form.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const responseData = formEvent.formData.fields
        .filter((field) => field.type !== 'label')
        .map((field) => ({
          questionId: field.id,
          answer: responses[field.id],
        }));

      const tags: string[][] = [
        ['d', `${formEvent.id}-${Date.now()}`],
        ['e', formEvent.eventId],
        ['a', `30168:${formEvent.pubkey}:${formEvent.id}`],
        ['p', formEvent.pubkey],
        ['alt', `Response to form: ${formEvent.formData.name}`],
        ...formEvent.relays.map((relay) => ['relay', relay]),
      ];

      publishEvent(
        {
          event: {
            kind: 30169,
            content: JSON.stringify(responseData),
            tags,
          },
        },
        {
          onSuccess: () => {
            setIsSubmitted(true);
            toast({
              title: 'Response Submitted',
              description: 'Your response has been recorded.',
            });
          },
          onError: (err) => {
            console.error('Failed to submit response:', err);
            toast({
              title: 'Error',
              description: 'Failed to submit response. Please try again.',
              variant: 'destructive',
            });
          },
        }
      );
    } catch (err) {
      console.error('Failed to submit form:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit form.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (error || !formEvent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The form you're looking for doesn't exist or has been deleted.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="h-16 w-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Response Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for completing the form. Your response has been recorded.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false);
                    setResponses({});
                  }}
                >
                  Submit Another Response
                </Button>
                <Button onClick={() => window.history.back()}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { formData } = formEvent;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{formData.name}</CardTitle>
                {formData.description && (
                  <CardDescription className="mt-1">{formData.description}</CardDescription>
                )}
              </div>
            </div>
            <EmbeddedFormAuthorBadge pubkey={formEvent.pubkey} />
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {!user && (
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Login Required</h4>
                    <p className="text-sm text-muted-foreground">
                      Please log in to submit your response.
                    </p>
                  </div>
                  <LoginArea />
                </div>
              </div>
            )}

            {formData.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.type === 'label' ? (
                  <div className="py-2">
                    <p className="text-sm font-medium leading-relaxed">{field.label}</p>
                    {field.description && (
                      <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <Label htmlFor={field.id} className="flex items-center gap-2">
                      <span>{field.label}</span>
                      {field.required && (
                        <Badge variant="destructive" className="text-[10px]">
                          Required
                        </Badge>
                      )}
                    </Label>
                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                    <EmbeddedFieldRenderer
                      field={field}
                      value={responses[field.id] || (field.type === 'multipleChoice' ? [] : '')}
                      onChange={(value) =>
                        setResponses((prev) => ({ ...prev, [field.id]: value }))
                      }
                      error={errors[field.id]}
                    />
                    {errors[field.id] && (
                      <p className="text-sm text-destructive">{errors[field.id]}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </CardContent>

          <CardFooter className="border-t bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Nostr Form</Badge>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!user || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
