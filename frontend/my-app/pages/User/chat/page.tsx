"use client"
import axios from "axios"
import { useEffect, useRef, useState } from "react"
import util from "tweetnacl-util"
import { getOrCreateKeyPair, encryptMessage, decryptMessage } from "./lib/crypto"

const CHAT_API = "http://localhost:3001"
const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "ws://localhost:3003"

export function Chat(){
const [conversationList,setConversationList]=useState([])
const [conversationId,setConversationId]=useState(null)
const [otherUserId,setOtherUserId]=useState(null)
const [messages,setMessages]=useState([])
const [conloading,setConLoading]=useState(true)
const [msgloading,setMsgLoading]=useState(false)
const keyPairRef=useRef<{publicKey: Uint8Array, privateKey: Uint8Array} | null>(null)

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

}},[])



return <div></div>



}