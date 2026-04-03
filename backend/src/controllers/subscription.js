import Stripe from 'stripe'
import { getFirestore } from '../config/firebase_config.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_REPLACE_ME')

const USERS_COLLECTION = 'users'
const CHAT_USAGE_COLLECTION = 'chat_usage'

// Plan definitions
export const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 0,
    features: ['property_view', 'property_add', 'chatbot_limited'],
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate',
    price: 2000, // $20.00 in cents
    features: ['property_view', 'property_add', 'chatbot_unlimited', 'roi', 'heatmap'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 5000, // $50.00 in cents
    features: ['property_view', 'property_add', 'chatbot_unlimited', 'roi', 'heatmap', 'recommendations', 'property_auth'],
  },
}

/**
 * Get the current user's subscription plan
 * GET /api/subscription/plan
 */
export async function getUserPlan(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get()

    if (!userDoc.exists) {
      return res.json({
        success: true,
        plan: 'basic',
        planDetails: PLANS.basic,
        subscriptionStatus: null,
      })
    }

    const userData = userDoc.data()
    const plan = userData.subscriptionPlan || 'basic'

    // Check chatbot usage for basic users
    let chatUsage = null
    if (plan === 'basic') {
      const usageDoc = await db.collection(CHAT_USAGE_COLLECTION).doc(userId).get()
      if (usageDoc.exists) {
        const usage = usageDoc.data()
        const windowStart = new Date(usage.windowStart)
        const now = new Date()
        const hoursDiff = (now - windowStart) / (1000 * 60 * 60)

        if (hoursDiff < 24) {
          chatUsage = {
            messagesUsed: usage.messageCount || 0,
            limit: 10,
            resetsAt: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          }
        } else {
          chatUsage = { messagesUsed: 0, limit: 10, resetsAt: null }
        }
      } else {
        chatUsage = { messagesUsed: 0, limit: 10, resetsAt: null }
      }
    }

    res.json({
      success: true,
      plan,
      planDetails: PLANS[plan] || PLANS.basic,
      subscriptionStatus: userData.subscriptionStatus || null,
      subscriptionExpiresAt: userData.subscriptionExpiresAt || null,
      stripeCustomerId: userData.stripeCustomerId || null,
      chatUsage,
    })
  } catch (error) {
    console.error('Error getting user plan:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Create a Stripe Checkout Session
 * POST /api/subscription/checkout
 * Body: { planId: 'intermediate' | 'premium' }
 */
export async function createCheckoutSession(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid
    const userEmail = req.user?.email
    const { planId } = req.body

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    if (!planId || !['intermediate', 'premium'].includes(planId)) {
      return res.status(400).json({ success: false, error: 'Invalid plan. Choose "intermediate" or "premium".' })
    }

    const plan = PLANS[planId]

    // Get or create Stripe customer
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get()
    let stripeCustomerId = userDoc.exists ? userDoc.data().stripeCustomerId : null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUid: userId },
      })
      stripeCustomerId = customer.id
      await db.collection(USERS_COLLECTION).doc(userId).update({
        stripeCustomerId: customer.id,
      })
    }

    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `HouseHopper ${plan.name} Plan`,
          description: `Lifetime payment for ${plan.name} features`,
        },
        unit_amount: plan.price,
      },
      quantity: 1,
    }]

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: lineItems,
      success_url: `${req.headers.origin || 'http://localhost:5173'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/pricing`,
      metadata: { firebaseUid: userId, planId },
    })

    console.log(`💳 Checkout session created for user ${userId} — plan: ${planId}`)

    res.json({ success: true, url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Verify a completed Stripe Checkout Session and activate the plan.
 * This is the primary mechanism to update the user's plan after payment,
 * since Stripe webhooks cannot reach localhost during development.
 * POST /api/subscription/verify-session
 * Body: { sessionId: 'cs_test_...' }
 */
export async function verifySession(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid
    const { sessionId } = req.body

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' })
    }

    // Verify the session belongs to this user
    if (session.metadata?.firebaseUid !== userId) {
      return res.status(403).json({ success: false, error: 'Session does not belong to this user' })
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: `Payment not completed. Status: ${session.payment_status}`,
      })
    }

    const planId = session.metadata?.planId

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ success: false, error: 'Invalid plan in session metadata' })
    }

    // Update the user's plan in Firestore
    await db.collection(USERS_COLLECTION).doc(userId).update({
      subscriptionPlan: planId,
      subscriptionStatus: 'active',
      stripePaymentIntentId: session.payment_intent || session.id,
      updatedAt: new Date().toISOString(),
    })

    console.log(`✅ Payment verified & plan activated: ${userId} → ${planId}`)

    res.json({
      success: true,
      plan: planId,
      planDetails: PLANS[planId],
    })
  } catch (error) {
    console.error('Error verifying session:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Create a Stripe Customer Portal Session (manage/cancel subscription)
 * POST /api/subscription/portal
 */
export async function createCustomerPortalSession(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get()
    const stripeCustomerId = userDoc.exists ? userDoc.data().stripeCustomerId : null

    if (!stripeCustomerId) {
      return res.status(400).json({ success: false, error: 'No active subscription found.' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.headers.origin || 'http://localhost:5173'}/dashboard`,
    })

    res.json({ success: true, url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Handle Stripe Webhook events
 * POST /api/subscription/webhook
 */
export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    if (webhookSecret && webhookSecret !== 'whsec_REPLACE_ME') {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } else {
      // Development fallback — parse the raw body directly
      event = JSON.parse(req.body.toString())
      console.warn('⚠️  Webhook signature verification skipped (no secret configured)')
    }
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const db = getFirestore()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const firebaseUid = session.metadata?.firebaseUid
        const planId = session.metadata?.planId

        if (firebaseUid && planId) {
          await db.collection(USERS_COLLECTION).doc(firebaseUid).update({
            subscriptionPlan: planId,
            subscriptionStatus: 'active',
            stripePaymentIntentId: session.payment_intent || session.id,
            updatedAt: new Date().toISOString(),
          })
          console.log(`✅ Payment completed: ${firebaseUid} → ${planId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Find user by Stripe customer ID
        const usersSnapshot = await db.collection(USERS_COLLECTION)
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get()

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0]
          await userDoc.ref.update({
            subscriptionStatus: subscription.status,
            subscriptionExpiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          })
          console.log(`📋 Subscription updated for customer ${customerId}: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        const usersSnapshot = await db.collection(USERS_COLLECTION)
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get()

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0]
          await userDoc.ref.update({
            subscriptionPlan: 'basic',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            updatedAt: new Date().toISOString(),
          })
          console.log(`🔻 Subscription canceled — customer ${customerId} downgraded to basic`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook event:', error)
  }

  res.json({ received: true })
}
