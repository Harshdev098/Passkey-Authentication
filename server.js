const express = require('express')
const crypto = require('crypto-js')
const simpleWebAuthn = require('@simplewebauthn/server')
const path = require('path')
const app = express()
app.use(express.json())

app.use(express.static(__dirname))
if (!globalThis.crypto) {
    globalThis.crypto = crypto
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})
app.get('/passgenerate', (req, res) => {
    res.sendFile(path.join(__dirname, '/passgenerate.html'))
})

const user = {}
const challenge = {}
app.post('/register', (req, res) => {
    const name = req.body.name;
    const password = req.body.password
    const id = `user_${Date.now()}`
    const make = { name, password }
    user[id] = make
    console.log(user)
    res.status(200).send({ id })
})
app.get('/challenge/make', async (req, res) => {
    const userid = req.query.userid;
    console.log("userid ", userid)
    if (!user[userid]) {
        res.status(400).send('user not found')
    }
    console.log(user[userid])
    console.log(user)
    const username = user[userid].name
    const challengePayload = await simpleWebAuthn.generateRegistrationOptions({
        rpID: 'localhost',
        rpName: 'My Localhost',
        userName: username,
        attestationType: 'direct'
    })
    challenge[userid] = challengePayload.challenge
    console.log("challenge payload", challengePayload)
    res.send({ options: challengePayload })
})
app.post('/challenge/accepted', async (req, res) => {
    const userid = req.query.userid
    const credential = req.body.credential
    console.log("data from frontend ",userid,credential)
    if (!user[userid]) {
        res.status(400).send('user not found')
    }
    else {
        const storedChallenge = challenge[userid]
        const verificationResult = await simpleWebAuthn.verifyRegistrationResponse({
            expectedChallenge: storedChallenge,
            expectedOrigin: 'http://localhost:3000',
            expectedRPID: 'localhost',
            response: credential
        })
        if (!verificationResult.verified) {
            console.log("user denied")
            res.status(400).send("not verified")
        }
        else {
            user[userid].passkey = verificationResult.registrationInfo;
            res.status(200).send("verified")
        }
    }
})

const port = 3000;
app.listen(port, () => {
    console.log("server is listening at 3000")
})