# AI assistant (Claude)

Two assistants, both **off** until switched on in **Settings → AI assistant**:

- **Customer AI trip planner** (Plan my trip page): builds a day-by-day plan from our real tours and destinations only, never gives prices. "Send to our team" asks for name, email, WhatsApp, first travel day and travelers, emails a 6-digit code, and only the right code creates an **order** (source *AI planner*, no price) with the plan as its **itinerary**. Staff then price it the usual way (Orders → Price it). The customer gets an email with their booking page link.
- **Staff assistant** (Assistant page, for Owner, Manager, Sales, Tour operator): finds orders, reads one order, lists inquiries, runs a **leakage report** (where customers drop out, worst first, with booking IDs), lists tours. It can **propose**: an email to an order's customer, an itinerary (for an order or standalone), a request to the customer (passports, balance, note), an internal note, a status change. **Nothing runs until the staff member presses Confirm.**

## Cost
Claude Haiku 5.5 for everything (cheapest): roughly $1–8 a month at normal volumes. The planner can be switched to Sonnet 5.5 in Settings (better plans, about 20× the cost). A **daily spending limit** (default $1) covers both assistants; when it is reached they pause until the next day and the planner points customers to WhatsApp. Spend today and this month is shown in Settings → AI assistant.

## Safety
- The API key (`ANTHROPIC_API_KEY`) is only used on the server.
- The AI only works through our own small, checked functions (`src/lib/ai/customer.ts`, `staff.ts`). Each checks the person's role, like the rest of the panel; costs and profit only for Owner/Manager.
- It never receives customers' email addresses, phone numbers, passports or uploaded files. Emails go only to the email already on the order.
- Customer and staff conversations are stored on the server; the browser only sends the next message, so it can't rewrite the conversation.
- Text from customers (names, notes, messages) is treated as data, never as instructions; and every action needs Confirm, showing exactly what will happen.
- A proposed action is saved on the server; Confirm sends only its id. It must belong to that staff member, be under 30 minutes old, and pass every check again when it runs. A double click runs it once.
- Every AI plan is checked against the database before it is shown or saved: real destinations, real tour slugs (made-up ones are removed), 1–21 days.
- Real contacts only: name, email (no temporary email services, no test@ / example.com) and WhatsApp with country code (no repeated or counting digits) are checked; the email is proven by a code (hashed, 10 minutes, 5 tries, one use).
- Limits: planner 20 messages/hour and 60/day per visitor, 25 per chat, 1,500 characters per message; codes 3/hour per email; sends 5/day per visitor; staff 60 requests/hour each. Limits work across all servers (database-backed).
- Logs: conversations, usage and actions are stored; every confirmed action is in the order's history ("AI assistant, confirmed by …") and the audit log. Customer chats are deleted after 90 days, staff chats after 180, old suggestions after 30 days (nightly job).

## Trying it on a test copy first
This is built on the **ai-agent** branch. Vercel makes a **preview link** for it automatically; the live site is unchanged.

1. **A test database** (so test orders never reach the real Orders list): in Turso, create a new database (e.g. `egyptknight-preview`) and a token for it.
2. In **Vercel → Project → Settings → Environment Variables**, add for **Preview only**:
   - `DATABASE_URL` and `DATABASE_AUTH_TOKEN` = the test database
   - `ANTHROPIC_API_KEY` = your key from the Claude Console (set a monthly spend limit there too)
   - (`AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, email settings: same as production, or test values)
3. Redeploy the preview. The test database sets itself up on the first visit, with sample tours.
4. Log in to the preview's `/admin`, go to **Settings → AI assistant**, switch on the planner and/or the staff assistant.
5. Try the planner on `/plan-my-trip` and the Assistant page. Check spend in Settings → AI assistant.

When you're happy, the branch is merged into `main`. The live site gets it switched **off**; switch it on in the live Settings when ready (staff first, then customers). Add `ANTHROPIC_API_KEY` for **Production** in Vercel at that point.
