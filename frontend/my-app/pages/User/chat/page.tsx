"use client"
import axios from "axios"
import { useEffect, useRef, useState } from "react"
import util from "tweetnacl-util"
import { getOrCreateKeyPair, encryptMessage, decryptMessage } from "./lib/crypto"
import { Sidebar } from "lucide-react"

const CHAT_API = "http://localhost:3001"
const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "ws://localhost:3003"

export function Chat(){
const [conversationList,setConversationList]=useState([])
const [conversationId,setConversationId]=useState(null)
const [otherUserId,setOtherUserId]=useState(null)
const [messages,setMessages]=useState([])
const [conLoading,setConLoading]=useState(true)
const [msgLoading,setMsgLoading]=useState(false)
const keyPairRef=useRef<{publicKey: Uint8Array, privateKey: Uint8Array} | null>(null)
const otherUserPublicKeyRef=useRef<Uint8Array | null>(null)
const inputRef=useRef<HTMLInputElement>(null)
useEffect(()=>{
async function fetchConversations(){
try{
const token = localStorage.getItem("token")
const res = await axios.get(`${CHAT_API}/api/conversations`,{
headers:{Authorization:`Bearer ${token}`}
})
setConversationList(res.data)
setConLoading(false)
const keyPairs=await getOrCreateKeyPair()
keyPairRef.current=keyPairs
}
catch(e){console.log("Failed to fetch conversations")}
}
fetchConversations()
},[])
useEffect(()=>{
async function fetchMessages(){
if(!conversationId || !keyPairRef.current) return
try{
setMsgLoading(true)
const token = localStorage.getItem("token")
const res=await axios.get(`${CHAT_API}/api/users/${otherUserId}/publickey`,{
headers:{Authorization:`Bearer ${token}`}
})
const otherUserPublicKey=res.data.publicKey
otherUserPublicKeyRef.current=util.decodeBase64(otherUserPublicKey)
const messagesRes=await axios.get(`${CHAT_API}/api/messages/${conversationId}`,{
headers:{Authorization:`Bearer ${token}`}
})
const messagesData=messagesRes.data
const msgArrayToRender=messagesData.map((m:any)=>{
const nonce=m.nonce
const cipherText=m.cipherText
const decrypted=decryptMessage(cipherText,nonce,keyPairRef.current!.privateKey,util.decodeBase64(otherUserPublicKey))
const senderId=m.senderId
const createdAt=m.createdAt
return {
    id:m.id,
    senderId,
    createdAt,
    text:decrypted}
})
setMessages(msgArrayToRender)
setMsgLoading(false)
}catch(e){console.log("failed to load")}
}
fetchMessages()
}
,[conversationId])


return <div>
<div>
    <Sidebar>
{conLoading ? <p>Loading Conversations...</p> : conversationList.map((c:any)=>{
    return <div onClick={()=>{
        setConversationId(c.conversationId)
        setOtherUserId(c.otherUserId)
    }}>
        <div>{c.conversationId}</div>
        <div>{c.otherUserName}</div>
    </div>
})}
    </Sidebar>
</div>

{msgLoading ? <p>Loading Messages .....</p>: <div>
    {messages.map((m:any)=>{return <div>
        <div>{m.senderId === otherUserId ? "Them" : "Me"}</div>
        <div>{m.text}</div>
        <div>{new Date(m.createdAt).toLocaleString()}</div>    
    </div>})}
    </div>}
{conversationId ? <input placeholder="Type your message" ref={inputRef} onKeyDown={async(e)=>{

if(e.key==='Enter'){const textToGetEncrypt=inputRef?.current?.value
if(textToGetEncrypt && keyPairRef.current && otherUserPublicKeyRef.current && conversationId){
const encryptedText=encryptMessage(textToGetEncrypt,keyPairRef.current.privateKey,otherUserPublicKeyRef.current)
const token = localStorage.getItem("token")
}

}}} ></input> : null}
</div>



}