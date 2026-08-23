'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'

interface FormattedContentProps {
  content: string
}

export function FormattedContent({ content }: FormattedContentProps) {
  let text = content
  let imageUrl: string | null = null
  let videoUrl: string | null = null
  let articleTitle: string | null = null
  let articleCoverUrl: string | null = null

  // 1. Extract article metadata if present
  const articleTitleMatch = text.match(/\[article_title:\s*([^\]]+)\]/)
  if (articleTitleMatch) {
    articleTitle = articleTitleMatch[1].trim()
    text = text.replace(articleTitleMatch[0], '').trim()
  }

  const articleCoverMatch = text.match(/\[article_cover:\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/)
  if (articleCoverMatch) {
    articleCoverUrl = articleCoverMatch[1].trim()
    text = text.replace(articleCoverMatch[0], '').trim()
  }

  // 2. Extract video if present: [video: url]
  const videoMatch = text.match(/\[video:\s*(https?:\/\/[^\s\]]+|data:video\/[^\s\]]+)\]/)
  if (videoMatch) {
    videoUrl = videoMatch[1].trim()
    text = text.replace(videoMatch[0], '').trim()
  }

  // 3. Extract embedded image if present: ![...](url) or [image: url]
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

  // 4. Parse code blocks: ```code```
  const parts = text.split(/(```[\s\S]*?```)/g)

  const renderTextWithHighlights = (rawText: string) => {
    // Split by paragraphs
    const paragraphs = rawText.split('\n')
    return paragraphs.map((para, pIdx) => {
      if (!para.trim()) {
        return <div key={pIdx} className="h-2" />
      }

      // Check for Markdown headers (e.g. # Title, ## Subtitle, ### Section)
      if (para.startsWith('### ')) {
        return (
          <h4 key={pIdx} className="text-base font-bold text-gray-950 dark:text-white mt-3 mb-1">
            {para.slice(4)}
          </h4>
        )
      }
      if (para.startsWith('## ')) {
        return (
          <h3 key={pIdx} className="text-lg font-bold text-gray-950 dark:text-white mt-4 mb-1.5">
            {para.slice(3)}
          </h3>
        )
      }
      if (para.startsWith('# ')) {
        return (
          <h2 key={pIdx} className="text-xl font-extrabold text-gray-950 dark:text-white mt-4 mb-2">
            {para.slice(2)}
          </h2>
        )
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

  const wordCount = text.split(/\s+/).filter(Boolean).length
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="space-y-2.5">
      {/* Render Article Header & Cover if this is an article */}
      {articleTitle && (
        <div className="space-y-2.5 pb-2">
          {articleCoverUrl && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 max-h-72">
              <Image
                src={articleCoverUrl}
                alt={articleTitle}
                width={800}
                height={400}
                className="w-full max-h-72 object-cover rounded-xl"
                unoptimized
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <BookOpen className="h-3.5 w-3.5" />
              Article · {readTimeMin} min read
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-white tracking-tight leading-snug">
            {articleTitle}
          </h2>
        </div>
      )}

      {/* Render Text / Paragraphs / Code Blocks */}
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
            alt="Attached Image"
            width={800}
            height={600}
            className="w-full max-h-96 object-contain rounded-xl"
            unoptimized
          />
        </div>
      )}

      {/* Render Attached Video */}
      {videoUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-800 max-h-96 flex items-center justify-center">
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-96 rounded-xl"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  )
}
