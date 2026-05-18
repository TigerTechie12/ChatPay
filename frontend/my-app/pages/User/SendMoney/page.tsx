"use client"
import {Navbar} from '@/components/navbar/page'
import React, { useState, useRef } from 'react'
import { Delete, Send } from 'lucide-react'
import axios from 'axios'

const USER_API = process.env.NEXT_PUBLIC_USER_BACKEND_URL

const PaymentKeypad = () => {
  const [amount, setAmount] = useState('0')
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const availableBalance = 41675.50

  const handlePress = (val: string) => {
    setAmount((prev) => {
      if (val === 'backspace') {
        return prev.length > 1 ? prev.slice(0, -1) : '0'
      }

      if (val === '.') {
        if (prev.includes('.')) return prev
        return prev + '.'
      }

      if (prev === '0' && val !== '.') {
        return val
      }

      if (prev.includes('.')) {
        const [, decimal] = prev.split('.')
        if (decimal && decimal.length >= 2) return prev
      }

      return prev + val
    })
  }

  const renderDisplay = () => {
    let intPart = amount
    let decPart = ''
    let ghostDec = '.00'

    if (amount.includes('.')) {
      [intPart, decPart] = amount.split('.')
      ghostDec = decPart.length === 0 ? '00' : decPart.length === 1 ? '0' : ''
    }

    return (
      <div className="text-6xl font-semibold tracking-tight text-center my-8">
        <Navbar></Navbar>
        <span className="text-gray-900">₹{intPart}</span>
        {amount.includes('.') && <span className="text-gray-900">.{decPart}</span>}
        {!amount.includes('.') && <span className="text-gray-400">{ghostDec}</span>}
        {amount.includes('.') && <span className="text-gray-400">{ghostDec}</span>}
      </div>
    )
  }

  const keypadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'backspace'
  ]

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Amount</h2>
        <span className="text-sm text-gray-500">
          Available ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {renderDisplay()}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {keypadButtons.map((btn) => (
          <button
            key={btn}
            onClick={() => handlePress(btn)}
            className="h-16 rounded-2xl border border-gray-200 text-2xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center"
          >
            {btn === 'backspace' ? <Delete className="w-6 h-6 text-gray-700" /> : btn}
          </button>
        ))}
      </div>

      <button
        disabled={amount === '0' || amount === '0.'}
        className="w-full bg-[#86d3a5] hover:bg-[#75c495] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Send className="w-5 h-5" />
        Select Receiver
      </button>
      <div className='font-bold'> Recipent</div>
      <input type="text" placeholder='Pay To A Phone Number' ref={inputRef}
        onKeyDown={async (event) => {
          const phoneNumber = inputRef.current?.value
          if (event.key === 'Enter') {
            const token = localStorage.getItem("token")
            await axios.post(`${USER_API}/api/v1/payAtWallet`, {
              phoneNumber,
              amount: parseFloat(amount)
            }, { headers: { Authorization: `Bearer ${token}` } })
          }
        }}
      />
    </div>
  )
}

export default PaymentKeypad
