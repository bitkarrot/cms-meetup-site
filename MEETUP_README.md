# Meetup Site - Nostr-Powered CMS

A comprehensive meetup and event management system built with React, TypeScript, and Nostr. This project provides both an admin CMS for content management and a public-facing website for community engagement.

## Features

### Admin Dashboard
- **Authentication**: Remote nostr.json validation for admin access control
- **Content Management**: Full CMS with TipTap rich text editor
- **Blog Management**: Create, edit, and manage long-form content (NIP-23)
- **Event Management**: Create and manage events with RSVP functionality (NIP-52)
- **Draft Support**: Save drafts to default relay before publishing
- **Site Configuration**: Customize logos, titles, favicons, and navigation
- **Relay Management**: Configure default relay for content reading and publishing relays for content distribution
- **Multi-Relay Publishing**: Content published to multiple relays automatically

### Public Website
- **Hero Section**: Customizable hero with background image and text
- **Event Listings**: Browse upcoming and past events with filtering
- **Event Details**: Full event pages with RSVP functionality
- **Blog Section**: Display published blog posts
- **Navigation**: Customizable navigation menu with submenus
- **Responsive Design**: Mobile-friendly interface

## Technical Stack

- **React 18.x**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components
- **Nostrify**: Nostr protocol integration
- **TipTap**: Rich text editor for content creation
- **React Query**: Data fetching and state management
- **React Router**: Client-side routing

## Configuration

### Relays
- **Default Relay**: `wss://swarm.hivetalk.org` (for content reading)
- **Publishing Relays**: 
  - `wss://relay.damus.io`
  - `wss://relay.primal.net` 
  - `wss://nos.lol`
- **Admin Control**: Configure which relays to use for content distribution

### Admin Access
Admin access is controlled by a remote nostr.json file located at:
`https://honey.hivetalk.org/.well-known/nostr.json`

## NIPs Used

- **NIP-23**: Long-form content for blog posts
- **NIP-52**: Calendar events for meetups
- **NIP-25**: Event RSVP functionality
- **NIP-04/17**: Direct messaging support (included)

## Project Structure

```
src/
├── components/
│   ├── admin/          # Admin dashboard components
│   ├── ui/              # shadcn/ui components
│   └── ...            # Other shared components
├── contexts/             # React contexts
├── hooks/               # Custom hooks
├── pages/              # Page components
│   ├── admin/          # Admin pages
│   └── ...            # Public pages
└── lib/                # Utility functions
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

## Admin Features

### Blog Management
- Create and edit long-form content with rich text editor
- Save drafts before publishing
- Publish to multiple relays
- Categorize with tags

### Event Management
- Create date-based or time-based events
- Set locations and descriptions
- Manage event status (confirmed, tentative)
- Upload event images

### Site Configuration
- Customize site title and logo
- Configure hero section content
- Manage navigation menu structure
- Set favicon and Open Graph images

## Public Features

### Event RSVP
- Users can RSVP to events (Going, Maybe, Can't Go)
- View attendee lists
- See event history and comments

### Content Discovery
- Browse upcoming and past events
- Filter by date, location, or search
- Read blog posts and articles

## Security

- Admin access controlled by remote nostr.json
- Content validation and sanitization
- CSP headers configured
- No private keys stored in application

## Deployment

The application builds to static files that can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- S3 + CloudFront

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is open source and available under the MIT License.