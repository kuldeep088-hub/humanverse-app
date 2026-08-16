'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface FormattedContentProps {
  content: string
}

export function FormattedContent({ content }: FormattedContentProps) {
  // 1. Extract embedded image if present: ![...](url) or [image: url]
  let text = content
  let imageUrl: string | null = null

  const mdImageMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/)
  if (mdImageMatch) {
    imageUrl = mdImageMatch[1]
    text = text.replace(mdImageMatch[0], '').trim()
  } else {
    const customImageMatch = text.match(/\[image:\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/)
    if (customImageMatch) {
      imageUrl = customImageMatch[1]
      text = text.replace(customImageMatch[0], '').trim()
    }
  }

  // 2. Parse code blocks: ```code```
  const parts = text.split(/(```[\s\S]*?```)/g)

  const renderTextWithHighlights = (rawText: string) => {
    // Split by paragraphs
    const paragraphs = rawText.split('\n')
    return paragraphs.map((para, pIdx) => {
      if (!para.trim()) {
        return <div key={pIdx} className="h-2" />
      }

      // Parse tokens for bold, italic, inline code, and hashtags
      const tokens = para.split(/(#\w+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)

      return (
        <p key={pIdx} className="leading-relaxed">
          {tokens.map((token, tIdx) => {
            if (!token) return null

            // Hashtag
            if (token.startsWith('#') && token.length > 1) {
              const slug = token.slice(1).toLowerCase()
              return (
                <Link
                  key={tIdx}
                  href={`/app/threads/${slug}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {token}
                </Link>
              )
            }

            // Inline Code
            if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
              return (
                <code
                  key={tIdx}
                  className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-800 dark:text-gray-200 border border-gray-200/60 dark:border-gray-700"
                >
                  {token.slice(1, -1)}
                </code>
              )
            }

            // Bold
            if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
              return (
                <strong key={tIdx} className="font-bold text-gray-950 dark:text-white">
                  {token.slice(2, -2)}
                </strong>
              )
            }

            // Italic
            if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
              return (
                <em key={tIdx} className="italic text-gray-800 dark:text-gray-200">
                  {token.slice(1, -1)}
                </em>
              )
            }

            return <span key={tIdx}>{token}</span>
          })}
        </p>
      )
    })
  }

  return (
    <div className="space-y-2">
      <div className="text-[15px] text-gray-900 dark:text-gray-100">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const codeContent = part.slice(3, -3).replace(/^[\w-]*\n/, '')
            return (
              <div
                key={index}
                className="my-3 overflow-x-auto rounded-xl bg-gray-950 p-3.5 text-xs text-gray-100 font-mono border border-gray-800 shadow-inner"
              >
                <pre className="whitespace-pre">{codeContent.trim()}</pre>
              </div>
            )
          }
          return <div key={index}>{renderTextWithHighlights(part)}</div>
        })}
      </div>

      {/* Render Attached Image */}
      {imageUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 max-h-96 flex items-center justify-center">
          <Image
            src={imageUrl}
            alt="Attached Screenshot"
            width={800}
            height={600}
            className="w-full max-h-96 object-contain rounded-xl"
            unoptimized
          />
        </div>
      )}
    </div>
  )
}
