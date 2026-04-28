import nacl from 'tweetnacl'
import axios from 'axios'
import util from 'tweetnacl-util'

export async function getOrCreateKeyPair() {
  const stored = localStorage.getItem('chatKeyPair')
  if (!stored) {
    const keyPair = nacl.box.keyPair()
    const newStored = {
      publicKey: util.encodeBase64(keyPair.publicKey),
      privateKey: util.encodeBase64(keyPair.secretKey)
    }
    localStorage.setItem('chatKeyPair', JSON.stringify(newStored))
    await axios.post('/api/users/publickey', { publicKey: newStored.publicKey })
  }
  const storedKeyPair = JSON.parse(localStorage.getItem('chatKeyPair')!)
  return {
    publicKey: util.decodeBase64(storedKeyPair.publicKey),
    privateKey: util.decodeBase64(storedKeyPair.privateKey)
  }
}

export function encryptMessage(message: string, myPrivateKey: Uint8Array, theirPublicKey: Uint8Array) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageUInt8 = util.decodeUTF8(message)
  const cipherText = nacl.box(messageUInt8, nonce, theirPublicKey, myPrivateKey)
  return {
    cipherText: util.encodeBase64(cipherText),
    nonce: util.encodeBase64(nonce)
  }
}

export function decryptMessage(
  cipherTextB64: string,
  nonceB64: string,
  myPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array
): string | null {
  const ct = util.decodeBase64(cipherTextB64)
  const n = util.decodeBase64(nonceB64)
  const plain = nacl.box.open(ct, n, theirPublicKey, myPrivateKey)
  return plain ? util.encodeUTF8(plain) : null
}
