import nacl from 'tweetnacl
import axios from 'axios'
export function getOrCreateKeyPair(){
const keyPair=localStorage.getItem('chatKeypair')
if(!keyPair){
    const keyPair=nacl.box.keyPair()

}

}

export function encryptMessage(){}

export function decryptMessage(){}
