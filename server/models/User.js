import crypto from 'crypto'
import mongoose from 'mongoose'
import validator from 'validator'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
      type: String,
      minlength: 8,
      select: false
    },
    salt: {
      type: String
    },
    role: {
      type: String,
      enum: ['basic', 'admin'],
      default: 'basic'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    firstLogin: {
      type: Boolean,
      default: true
    },
    passwordChangedAt: Date
  },
  {
    timestamps: true
  }
)

userSchema.virtual('id').get(function () {
  return this._id.toHexString()
})

userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password') || !this.password) return next()

    const salt = crypto.randomBytes(16).toString('hex')
    this.salt = salt
    this.password = crypto.pbkdf2Sync(this.password, salt, 1000, 64, 'sha512').toString('hex')
    this.passwordChangedAt = Date.now() - 1000

    next()
  } catch (error) {
    next(error)
  }
})

userSchema.methods.verifyPassword = function (candidate) {
  if (!this.password || !this.salt) return false
  const hashed = crypto.pbkdf2Sync(candidate, this.salt, 1000, 64, 'sha512').toString('hex')
  return hashed === this.password
}

export default mongoose.models.User || mongoose.model('User', userSchema)
