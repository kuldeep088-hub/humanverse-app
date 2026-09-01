'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, getInitials } from '@/lib/utils'
import { getProfilePhoto } from '@/lib/avatar'

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  fallbackName?: string
  src?: string
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, fallbackName, src, ...props }, ref) => {
  // If no src is provided, derive a realistic profile photo from the fallback name
  const resolvedSrc = src || (fallbackName ? getProfilePhoto(undefined, fallbackName) : undefined)

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800',
        className
      )}
      {...props}
    >
      <AvatarPrimitive.Image
        className="aspect-square h-full w-full object-cover rounded-full"
        src={resolvedSrc}
        alt={fallbackName || 'Profile Photo'}
        loading="lazy"
      />
      <AvatarPrimitive.Fallback
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-semibold select-none',
          fallbackName ? 'text-xs sm:text-sm font-semibold' : ''
        )}
      >
        {fallbackName ? getInitials(fallbackName) : '?'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => {
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn('aspect-square h-full w-full', className)}
      {...props}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-foreground',
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
