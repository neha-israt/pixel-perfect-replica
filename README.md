# OrderClean BD

A mobile-friendly order-cleaning and CSV preparation tool built for Bangladeshi F-commerce merchants. Paste messy customer order messages from Facebook Messenger or WhatsApp and turn them into clean, courier-ready spreadsheets for **Steadfast** and **Pathao** in seconds.

**Live App:** [https://orderclean-bd.vercel.app/](https://orderclean-bd.vercel.app/)

## Features

- **Smart Unstructured Order Parsing:** Automatically extracts recipient names, 11-digit Bangladeshi phone numbers (preserving leading zeros), delivery addresses, and COD amounts from raw chat messages while filtering out conversational greetings and chat noise.
- **Automated Delivery Rate & COD Calculation:**
  - Defaults to **৳60** for **Inside Dhaka** and **৳110** for **Outside Dhaka**.
  - Respects explicit total bills and partial advance payments (e.g., bKash advances) when calculating product amounts and total COD.
- **Manual Product & Quick Catalog Support:** Leaves item fields ready for accurate manual seller input, paired with an optional **Manage Products** quick-reference catalog.
- **Duplicate Order Detection:** Flags duplicate orders matching existing phone numbers/details in the active list with **Skip Duplicate** and **Add Anyway** controls.
- **Automatic Local Persistence:** Saves active orders and invoice numbering in `localStorage` (`Auto-saved on this device`) so data survives page refreshes, with a **Clear All** option when starting a new batch.
- **Courier-Ready CSV Exports:** Generates properly formatted CSV files tailored for **Steadfast** and **Pathao** bulk uploads.

## Tech Stack

- React + TypeScript
- Vite / TanStack Start
- Tailwind CSS & shadcn/ui
- Vitest (unit & parser edge-case test suite)

## Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start the development server
npm run dev

# Run the test suite
npm test

# Create a production build
npm run build
```

## Deployment

Connected to GitHub and deployed via **Vercel** at [https://orderclean-bd.vercel.app/](https://orderclean-bd.vercel.app/). Pushing changes to `main` automatically triggers a fresh production deployment.

## Credits & Acknowledgments

- Initial application scaffolding and base UI generated with **Lovable**, followed by iterative parser, state persistence, duplicate detection, and export refinements in VS Code.
