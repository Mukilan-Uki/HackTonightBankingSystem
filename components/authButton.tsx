import type { ButtonHTMLAttributes } from 'react'

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export default function AuthButton({
  className = '',
  type = 'button',
  ...props
}: AuthButtonProps) {
  return (
    <button
      type={type}
      className={`h-[82px] w-[228px] rounded-[38px] bg-[rgba(147,85,146,0.76)] text-[1.85rem] font-bold text-white shadow-[0_4px_4px_0_rgba(0,0,0,0.30),0_8px_12px_6px_rgba(0,0,0,0.15)] ${className}`}
      {...props}
    />
  )
}
