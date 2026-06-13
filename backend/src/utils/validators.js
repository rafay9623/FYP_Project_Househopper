import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Invalid email format').min(1).max(255),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(2).max(50).regex(/^[a-zA-Z\s\-']+$/).optional(),
  lastName: z.string().min(2).max(50).regex(/^[a-zA-Z\s\-']+$/).optional(),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body)
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors
    })
  }
}
