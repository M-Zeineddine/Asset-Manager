# LocalTreats - Gift App for Lebanon

## Overview
LocalTreats is a mobile gifting app that allows diaspora to send curated gifts from local Lebanese merchants. Buyers browse merchants, choose gift products, customize with messages and themes, and share gift links. Receivers redeem gifts at merchants using QR codes.

## Architecture
- **Frontend**: Expo React Native with expo-router (file-based routing)
- **Backend**: Express.js with in-memory storage (seeded data)
- **State**: React Query for server state, no database needed
- **Fonts**: Inter (Google Fonts)

## Project Structure
```
app/
  _layout.tsx          - Root layout with providers and fonts
  index.tsx            - Home screen (browse merchants by city/category)
  +not-found.tsx       - 404 screen
  merchant/
    [id].tsx           - Merchant detail with gift products
  gift/
    customize.tsx      - Gift customization (message, theme, channel)
    checkout.tsx       - Review & mock payment
    success.tsx        - Success + share screen
    reveal.tsx         - Gift reveal animation for receiver
    redeem.tsx         - QR code + redeem code display
server/
  index.ts             - Express server setup
  routes.ts            - API routes (/api/merchants, /api/products, /api/orders, /api/redeem)
  storage.ts           - In-memory storage with seed data
  seed-data.ts         - 3 merchants, 24 gift products
  templates/
    landing-page.html  - Expo Go landing page
    gift-page.html     - Web gift reveal page (/g/:orderId?t=token)
shared/
  schema.ts            - TypeScript types and Zod schemas
```

## Key Features
- Browse merchants by city (Beirut, Byblos) and category (Coffee, Dessert, Meals)
- Gift customization with 5 card themes, 3 delivery channels
- Mock payment checkout
- Share via WhatsApp or copy link
- Animated gift reveal screen
- QR code + human-readable redemption code
- Web gift landing page at /g/:orderId?t=token

## Seed Data
- 3 merchants: Cafe Em Nazih (Beirut), Bachir Ice Cream (Beirut), Tawlet Byblos (Byblos)
- 24 products across coffee, dessert, and meals categories
- Prices in USD ($6 - $95)

## Recent Changes
- 2026-02-20: Initial build of LocalTreats MVP
