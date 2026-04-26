import nacl from 'tweetnacl'
import util from 'tweetnacl-util'
import { encryptMessage, decryptMessage } from './crypto'

const pairA = nacl.box.keyPair()
const pairB = nacl.box.keyPair()

const original = "hello from A to B"

const { cipherText, nonce } = encryptMessage(original, pairA.secretKey, pairB.publicKey)

const decryptedBytes = decryptMessage(cipherText, nonce, pairB.secretKey, pairA.publicKey)

if (!decryptedBytes) {
    console.error("FAIL: decryption returned null")
    process.exit(1)
}

const decrypted = util.encodeUTF8(decryptedBytes)

if (decrypted === original) {
    console.log("PASS:", decrypted)
} else {
    console.error("FAIL: got", decrypted)
    process.exit(1)
}
