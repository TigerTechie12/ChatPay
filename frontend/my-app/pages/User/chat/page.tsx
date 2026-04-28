"use client"
import axios from "axios"
import { useEffect, useRef, useState } from "react"
import util from "tweetnacl-util"
import { getOrCreateKeyPair, encryptMessage, decryptMessage } from "./lib/crypto"

type Conversation = { conversationId: number; otherUserName: string; otherUserId: number }
type Message = { id: number; senderId: number; cipherText: string; nonce: string; createdAt: string }

const CHAT_API = "http://localhost:3001"
const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "ws://localhost:3003"

function getMyUserId(): number | null {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.userId ?? null
  } catch {
    return null
  }
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [myKeys, setMyKeys] = useState<{ publicKey: Uint8Array; privateKey: Uint8Array } | null>(null)
  const [theirPublicKey, setTheirPublicKey] = useState<Uint8Array | null>(null)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const myUserId = useRef<number | null>(null)

  useEffect(() => {
    async function init() {
      const keys = await getOrCreateKeyPair()
      setMyKeys(keys)
      myUserId.current = getMyUserId()
      const res = await axios.get(`${CHAT_API}/api/conversations`)
      setConversations(res.data)
    }
    init()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    wsRef.current = ws
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "USER_TYPING") {
        setIsTyping(true)
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 2000)
        return
      }
      setMessages((prev) => [...prev, data as Message])
    }
    return () => { ws.close(); wsRef.current = null }
  }, [])

  async function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    setMessages([])
    setTheirPublicKey(null)
    const [msgRes, pkRes] = await Promise.all([
      axios.get(`${CHAT_API}/api/messages/${conv.conversationId}`),
      axios.get(`${CHAT_API}/api/users/${conv.otherUserId}/publickey`)
    ])
    setTheirPublicKey(util.decodeBase64(pkRes.data.publicKey))
    setMessages(msgRes.data.messages)
  }

  function sendMessage() {
    if (!input.trim() || !myKeys || !theirPublicKey || !selectedConv || !wsRef.current) return
    const { cipherText, nonce } = encryptMessage(input, myKeys.privateKey, theirPublicKey)
    wsRef.current.send(JSON.stringify({ conversationId: selectedConv.conversationId, cipherText, nonce }))
    setInput("")
  }

  function sendTyping() {
    if (!selectedConv || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: "TYPING", conversationId: selectedConv.conversationId }))
  }

  function decryptOrFallback(msg: Message): string {
    if (!myKeys || !theirPublicKey) return "[encrypted]"
    return decryptMessage(msg.cipherText, msg.nonce, myKeys.privateKey, theirPublicKey) ?? "[unable to decrypt]"
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.conversationId}
              onClick={() => selectConversation(c)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConv?.conversationId === c.conversationId ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <p className="font-medium text-gray-900">{c.otherUserName}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{selectedConv.otherUserName}</h3>
              {isTyping && <p className="text-xs text-gray-500">typing...</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => {
                const isMe = m.senderId === myUserId.current
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                        isMe ? "bg-blue-500 text-white" : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      {decryptOrFallback(m)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex gap-2">
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); sendTyping() }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}
