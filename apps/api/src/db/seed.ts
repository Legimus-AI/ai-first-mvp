import bcrypt from 'bcryptjs'
import { bots } from '../slices/bots/schema'
import { conversations, messages } from '../slices/conversations/schema'
import { documents } from '../slices/documents/schema'
import { leads } from '../slices/leads/schema'
import { users } from '../slices/users/schema'
import { getDb, initDb } from './client'

async function seed() {
	const dbUrl = process.env.DATABASE_URL ?? 'postgresql://mvp:mvp@localhost:5433/mvp'
	initDb(dbUrl)
	const db = getDb()

	console.log('Seeding database...')
	const { eq } = await import('drizzle-orm')

	// Clear existing data (in reverse dependency order)
	await db.delete(messages)
	await db.delete(conversations)
	await db.delete(leads)
	await db.delete(documents)
	await db.delete(bots)
	await db.delete(users)

	// --- Users ---
	const adminPasswordHash = bcrypt.hashSync('admin123', 10)
	const userPasswordHash = bcrypt.hashSync('user123', 10)

	const [adminUser, regularUser] = await db
		.insert(users)
		.values([
			{
				email: 'admin@example.com',
				name: 'Admin User',
				passwordHash: adminPasswordHash,
				role: 'admin',
			},
			{
				email: 'user@example.com',
				name: 'John Doe',
				passwordHash: userPasswordHash,
				role: 'user',
			},
		])
		.returning()

	console.log(`Seeded ${2} users`)

	// --- Bots ---
	const [ecommerceBot, supportBot] = await db
		.insert(bots)
		.values([
			{
				name: 'E-commerce Assistant',
				systemPrompt:
					'You are a helpful e-commerce assistant. Help customers find products, track orders, and answer questions about shipping and returns. Be friendly and professional.',
				model: 'gemini-2.0-flash',
				welcomeMessage: 'Hi! How can I help you with your shopping today?',
				userId: regularUser.id,
				isActive: true,
			},
			{
				name: 'Support Bot',
				systemPrompt:
					'You are a customer support specialist. Help users troubleshoot issues, answer technical questions, and escalate complex problems when needed. Be patient and thorough.',
				model: 'gemini-2.0-flash',
				welcomeMessage: 'Hello! I am here to help you. What can I assist you with?',
				userId: regularUser.id,
				isActive: true,
			},
		])
		.returning()

	console.log(`Seeded ${2} bots`)

	// --- Documents ---
	const docsData = [
		// E-commerce bot docs
		{
			botId: ecommerceBot.id,
			title: 'Return Policy',
			content: `Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the returned item.

To initiate a return:
1. Contact customer support with your order number
2. Receive a return authorization number
3. Ship the item back using our prepaid label
4. Receive your refund

Exceptions: Final sale items, customized products, and gift cards cannot be returned.`,
		},
		{
			botId: ecommerceBot.id,
			title: 'Shipping Information',
			content: `We offer multiple shipping options:

Standard Shipping (5-7 business days): $4.99
Express Shipping (2-3 business days): $9.99
Overnight Shipping (1 business day): $19.99

Free shipping on orders over $50!

International shipping is available to select countries. Shipping costs and delivery times vary by location.

We ship Monday-Friday. Orders placed after 2 PM will be processed the next business day.`,
		},
		{
			botId: ecommerceBot.id,
			title: 'Product Catalog',
			content: `We offer a wide range of products:

Electronics:
- Smartphones and tablets
- Laptops and computers
- Audio equipment
- Gaming consoles

Clothing:
- Men's apparel
- Women's apparel
- Shoes and accessories
- Kids clothing

Home & Garden:
- Furniture
- Kitchen appliances
- Decor items
- Garden tools

All products come with a 1-year warranty and 30-day satisfaction guarantee.`,
		},
		// Support bot docs
		{
			botId: supportBot.id,
			title: 'Account Management',
			content: `Managing your account:

To update your profile:
1. Log in to your account
2. Click on "Settings"
3. Edit your information
4. Save changes

Password reset:
- Click "Forgot Password" on the login page
- Enter your email
- Follow the link sent to your email

Privacy settings:
- Control who can see your information
- Manage email preferences
- Delete your account

For security, we recommend enabling two-factor authentication.`,
		},
		{
			botId: supportBot.id,
			title: 'Troubleshooting Guide',
			content: `Common issues and solutions:

Login problems:
- Clear browser cache and cookies
- Try incognito/private mode
- Reset your password
- Contact support if issue persists

Payment issues:
- Verify card details are correct
- Check if card is expired
- Try a different payment method
- Contact your bank if declined

Page not loading:
- Refresh the page
- Check internet connection
- Try a different browser
- Clear browser cache

For technical support, contact us 24/7.`,
		},
		{
			botId: supportBot.id,
			title: 'Contact Information',
			content: `Get in touch with us:

Customer Support:
- Email: support@example.com
- Phone: 1-800-123-4567
- Live Chat: Available 24/7 on our website

Business Hours:
Monday-Friday: 9 AM - 6 PM EST
Saturday: 10 AM - 4 PM EST
Sunday: Closed

Mailing Address:
123 Main Street
Suite 100
City, State 12345

Social Media:
- Twitter: @example
- Facebook: /example
- Instagram: @example`,
		},
	]

	const insertedDocs = await db.insert(documents).values(docsData).returning()
	console.log(`Seeded ${insertedDocs.length} documents`)

	// --- Leads ---
	const leadsData = [
		{
			botId: ecommerceBot.id,
			senderId: 'visitor-abc123',
			name: 'Sarah Johnson',
			email: 'sarah@example.com',
			phone: '+1234567890',
			metadata: { source: 'widget', referrer: 'google' },
		},
		{
			botId: ecommerceBot.id,
			senderId: 'visitor-def456',
			name: 'Mike Smith',
			email: 'mike@example.com',
			phone: null,
			metadata: { source: 'widget', referrer: 'facebook' },
		},
		{
			botId: supportBot.id,
			senderId: 'user-xyz789',
			name: null,
			email: null,
			phone: null,
			metadata: { source: 'widget' },
		},
	]

	const insertedLeads = await db.insert(leads).values(leadsData).returning()
	console.log(`Seeded ${insertedLeads.length} leads`)

	// --- Conversations & Messages ---
	const [conv1] = await db
		.insert(conversations)
		.values({
			botId: ecommerceBot.id,
			senderId: 'visitor-abc123',
			title: 'Return inquiry',
		})
		.returning()

	await db.insert(messages).values([
		{
			conversationId: conv1.id,
			role: 'user',
			content: 'What is your return policy?',
		},
		{
			conversationId: conv1.id,
			role: 'assistant',
			content:
				'Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-7 business days. Would you like to know how to initiate a return?',
		},
		{
			conversationId: conv1.id,
			role: 'user',
			content: 'Yes, how do I start a return?',
		},
		{
			conversationId: conv1.id,
			role: 'assistant',
			content:
				'To initiate a return: 1) Contact customer support with your order number, 2) Receive a return authorization number, 3) Ship the item back using our prepaid label, 4) Receive your refund. Is there anything specific you would like to return?',
		},
	])

	console.log(`Seeded ${1} conversation with ${4} messages`)

	console.log('\nSeed completed successfully!')
	console.log('\nTest credentials:')
	console.log('Admin: admin@example.com / admin123')
	console.log('User: user@example.com / user123')

	process.exit(0)
}

seed().catch((err) => {
	console.error('Seed failed:', err)
	process.exit(1)
})
