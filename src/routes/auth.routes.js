const express = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const router = express.Router()

router.post('/register', authController.userRegister)
router.post('/login', authController.userLogin)
router.get('/logout',authMiddleware, authController.userLogout)

router.put('/reset-password', authController.resetPassword)
router.delete('/delete-unverified', authController.deleteUnverified)


module.exports = router