import nacl from 'tweetnacl'
import axios from 'axios'
import util from 'tweetnacl-util'
export async function getOrCreateKeyPair(){
const keyPair=localStorage.getItem('chatKeyPair')
if(!keyPair){
    const keyPair=nacl.box.keyPair()

const stored={
publicKey:util.encodeBase64(keyPair.publicKey),
   privateKey:util.encodeBase64(keyPair.secretKey)
}
const publicKey=stored.publicKey
localStorage.setItem('chatKeyPair',JSON.stringify(stored))
await axios.post('',{publicKey:publicKey})

}
const storedKeyPair=JSON.parse(localStorage.getItem('chatKeyPair')!)
return {
    publicKey:util.decodeBase64(storedKeyPair.publicKey),
    privateKey:util.decodeBase64(storedKeyPair.privateKey)
}


}

export function encryptMessage(message:string,privateKey:Uint8Array,publicKey:Uint8Array){
const nonce=nacl.randomBytes(nacl.box.nonceLength)
const messageUInt8=util.decodeUTF8(message)
    const cipherText=nacl.box(messageUInt8, nonce, publicKey, privateKey)
return {cipherText,nonce}

}

export function decryptMessage(cipherText:any,nonce:any,privateKey:any,publicKey:any){
    const plainText=nacl.box.open(cipherText, nonce, publicKey, privateKey)
    return plainText
}
