"use client"

import React, { memo } from 'react'
import { useFormStatus } from 'react-dom'
import { cn } from '@workspace/ui/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import { Button, buttonVariants } from './button'
import { Spinner } from './spinner'

interface SubmitButtonProps extends Omit<React.ComponentProps<'button'>, 'type'>, VariantProps<typeof buttonVariants> {
  text: string
  textLoading?: string
  icon?: React.ReactNode
  iconLoading?: React.ReactNode
  isSubmitting?: boolean
  isDisabled?: boolean
  type?: 'submit' | 'button'
  form?: string
  showSpinner?: boolean
}

const SubmitButton = memo<SubmitButtonProps>(({
  text,
  textLoading,
  icon,
  iconLoading,
  variant = 'default',
  size = 'default',
  className,
  isSubmitting = false,
  isDisabled = false,
  type = 'submit',
  form,
  onClick,
  showSpinner = true,
  ...props
}) => {
  const { pending } = useFormStatus()

  const isLoading = pending || isSubmitting
  const disabled = isLoading || isDisabled

  return (
    <Button
      type={type}
      form={form}
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'gap-2 transition-all duration-200',
        isLoading && 'cursor-wait',
        disabled && !isLoading && 'cursor-not-allowed',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          {showSpinner && <Spinner className="h-4 w-4" />}
          {iconLoading && <span className="inline-flex">{iconLoading}</span>}
          <span>{textLoading || text}</span>
        </>
      ) : (
        <>
          {icon && <span className="inline-flex">{icon}</span>}
          <span>{text}</span>
        </>
      )}
    </Button>
  )
})

SubmitButton.displayName = 'SubmitButton'

export default SubmitButton
export type { SubmitButtonProps }
export { SubmitButton }
