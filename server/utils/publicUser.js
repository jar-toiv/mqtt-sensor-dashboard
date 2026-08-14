export const publicUser = user => ({
  _id: user._id,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  pendingInvite: !user.password,
  createdAt: user.createdAt
})

export default publicUser
