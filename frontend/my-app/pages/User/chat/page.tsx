"use client"
import axios from "axios"
import { useEffect, useRef, useState } from "react"
import util from "tweetnacl-util"
import { getOrCreateKeyPair, encryptMessage, decryptMessage } from "@/lib/chat/crypto"
import { Sidebar, Search, Loader2 } from "lucide-react"

const CHAT_API = process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? "http://localhost:3003"
const WS_URL = CHAT_API.replace(/^http/, "ws")
const USER_API = process.env.NEXT_PUBLIC_USER_BACKEND_URL

const avatarColors = ["bg-orange-500","bg-teal-600","bg-green-600","bg-blue-500","bg-purple-500","bg-red-500","bg-pink-500","bg-indigo-500"]

export function Chat(){
const [conversationList,setConversationList]=useState([])
const [conversationId, setConversationId] = useState<number | null>(null)
const conversationIdRef=useRef(null)
const otherUserId=useRef(null)
const [messages,setMessages]=useState<{id:number,senderId:string,text:string,createdAt:string}[]>([])
const [conLoading,setConLoading]=useState(true)
const [msgLoading,setMsgLoading]=useState(false)
const keyPairRef=useRef<{publicKey: Uint8Array, privateKey: Uint8Array} | null>(null)
const otherUserPublicKeyRef=useRef<Uint8Array | null>(null)
const inputRef=useRef<HTMLInputElement>(null)
const wsRef=useRef(null as WebSocket | null)
const messagesEndRef=useRef<HTMLDivElement>(null)
const [searchQuery,setSearchQuery]=useState("")
const [searchResults,setSearchResults]=useState<any[]>([])
const [searching,setSearching]=useState(false)
const [chatError,setChatError]=useState("")

useEffect(()=>{
  if(searchQuery.trim().length<2){setSearchResults([]);return}
  const token=localStorage.getItem("token")
  setSearching(true)
  const t=setTimeout(()=>{
    axios.get(`${USER_API}/api/v1/users/search?q=${encodeURIComponent(searchQuery.trim())}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(res=>setSearchResults(res.data.users ?? []))
      .catch(()=>setSearchResults([]))
      .finally(()=>setSearching(false))
  },300)
  return ()=>clearTimeout(t)
},[searchQuery])

async function startConversation(user:any){
  setChatError("")
  try{
    const token=localStorage.getItem("token")
    const res=await axios.post(`${CHAT_API}/api/conversations`,{otherUserId:user.id},{headers:{Authorization:`Bearer ${token}`}})
    const newId=res.data.conversationId
    const listRes=await axios.get(`${CHAT_API}/api/conversations`,{headers:{Authorization:`Bearer ${token}`}})
    setConversationList(listRes.data)
    conversationIdRef.current=newId
    setConversationId(newId)
    otherUserId.current=user.id
    setSearchQuery("")
    setSearchResults([])
  }catch(e:any){
    console.error("Failed to start conversation", e?.response?.status, e?.message)
    setChatError(`Couldn't start chat (${e?.response?.status ?? e?.message}). Is the chat server reachable?`)
  }
}
useEffect(()=>{
async function fetchConversations(){
try{
const token = localStorage.getItem("token")
const res = await axios.get(`${CHAT_API}/api/conversations`,{
headers:{Authorization:`Bearer ${token}`}
})
setConversationList(res.data)
setConLoading(false)
const keyPairs=await getOrCreateKeyPair(CHAT_API, token!)
keyPairRef.current=keyPairs
wsRef.current=new WebSocket(`${WS_URL}?token=${token}`)
wsRef.current.onopen=()=>{console.log("WebSocket Connected")}
wsRef.current.onmessage=(e)=>{
const data=JSON.parse(e.data)
if(data.conversationId ===conversationIdRef.current && data.senderId === otherUserId.current){
const decryptedMessage=decryptMessage(data.cipherText,data.nonce,keyPairRef.current!.privateKey,otherUserPublicKeyRef.current!)
setMessages((prev)=>[...prev,{id:data.id,senderId:data.senderId,text:decryptedMessage ?? "",createdAt:data.createdAt}])
}}
}
catch(e){console.log("Failed to fetch conversations")}
}
fetchConversations()
return ()=>{
wsRef.current?.close()}
},[])
useEffect(()=>{
async function fetchMessages(){
if(!conversationId || !keyPairRef.current) return
setMsgLoading(true)
setChatError("")
try{
const token = localStorage.getItem("token")
const res=await axios.get(`${CHAT_API}/api/users/${otherUserId.current}/publickey`,{
headers:{Authorization:`Bearer ${token}`}
})
const otherUserPublicKey=res.data.publicKey
if(!otherUserPublicKey){
  otherUserPublicKeyRef.current=null
  setMessages([])
  setChatError("This user hasn't opened ChatPay chat yet, so there's no encryption key for them. Ask them to open the Chat page once.")
  return
}
otherUserPublicKeyRef.current=util.decodeBase64(otherUserPublicKey)
const messagesRes=await axios.get(`${CHAT_API}/api/messages/${conversationIdRef.current}`,{
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
}catch(e){console.log("failed to load")}
finally{setMsgLoading(false)}
}
fetchMessages()
}
,[conversationId])

useEffect(()=>{
messagesEndRef.current?.scrollIntoView({behavior:"smooth"})
},[messages])

return <div className="min-h-screen bg-[#f5f5f0] flex">

  <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
    <div className="p-6 border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-4">Messages</h1>
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-gray-400 transition-colors">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)}
          placeholder="Search by phone number"
          className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
        {searching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
      </div>
      {chatError && <p className="mt-2 text-xs text-red-500">{chatError}</p>}
    </div>

    {searchQuery.trim().length>=2 && (
      <div className="border-b border-gray-200 max-h-72 overflow-y-auto">
        {searchResults.length===0 && !searching
          ? <div className="p-4 text-center text-sm text-gray-400">No users found</div>
          : searchResults.map((u:any,i:number)=>(
            <div key={u.id} onClick={()=>startConversation(u)}
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                {u.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">{u.name}</div>
                <div className="text-xs text-gray-400">{u.number}</div>
              </div>
            </div>
          ))}
      </div>
    )}

    <div className="flex-1 overflow-y-auto">
      {conLoading
        ? <div className="flex items-center justify-center p-8 text-gray-400 text-sm">Loading conversations...</div>
        : conversationList.map((c:any, i:number)=>{
          return <div
            key={c.conversationId}
            onClick={()=>{
              conversationIdRef.current=c.conversationId
              setConversationId(c.conversationId)
              otherUserId.current=c.otherUserId
            }}
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${conversationId === c.conversationId ? "bg-green-50 border-l-4 border-l-green-500" : ""}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${avatarColors[i % avatarColors.length]}`}>
              {c.otherUserName?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">{c.otherUserName}</div>
              <div className="text-xs text-gray-400">#{c.conversationId}</div>
            </div>
          </div>
        })}
    </div>
  </div>

  <div className="flex-1 flex flex-col min-w-0">
    {!conversationId
      ? <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-2">
            <Sidebar className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-base font-medium text-gray-500">Select a conversation to start chatting</p>
          <p className="text-sm text-gray-400">Choose from your conversations on the left</p>
        </div>
      : <>
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            {conversationList.map((c:any, i:number)=> c.conversationId === conversationId
              ? <div key={c.conversationId} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                    {c.otherUserName?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{c.otherUserName}</div>
                    <div className="text-xs text-green-500 font-medium">Connected</div>
                  </div>
                </div>
              : null
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
            {msgLoading
              ? <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Loading messages...</div>
              : chatError
              ? <div className="flex items-center justify-center py-8 px-6 text-center text-amber-600 text-sm">{chatError}</div>
              : messages.map((m:any)=>{
                const isMe = m.senderId !== otherUserId.current
                return <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-green-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"}`}>
                    {m.text}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 px-1">
                    {new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              })}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-400 transition-colors bg-white">
              <input
                placeholder="Type a message..."
                ref={inputRef}
                onKeyDown={async(e)=>{
                  if(e.key ==="Enter"){
                    const text=inputRef.current?.value?.trim()
                    if(!text) return
                    if(!otherUserPublicKeyRef.current){
                      setChatError("Can't send — this user hasn't set up their chat encryption key yet.")
                      return
                    }
                    setMessages((prev)=>[...prev,{id:Math.random(),senderId:"me",text,createdAt:new Date().toISOString()}])
                    const encryptedText=encryptMessage(text,keyPairRef.current!.privateKey,otherUserPublicKeyRef.current!)
                    wsRef.current?.send(JSON.stringify({type: "message",
                      conversationId: conversationId,
                      cipherText: encryptedText.cipherText,
                      nonce: encryptedText.nonce}))
                    inputRef.current!.value=""
                  }
                }}
                className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder:text-gray-400"
              />
              <span className="text-xs text-gray-400 select-none">↵ Enter</span>
            </div>
          </div>
        </>
    }
  </div>

</div>
}

export default Chat
