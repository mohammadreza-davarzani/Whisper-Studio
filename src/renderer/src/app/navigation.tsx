import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'

import type { AppRouteId } from './routing'
import { getRoutePath, setRouteHash } from './routing'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: AppRouteId
  children: ReactNode
}

export function Link({ to, onClick, children, ...props }: LinkProps): JSX.Element {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    onClick?.(event)

    if (!event.defaultPrevented) {
      event.preventDefault()
      setRouteHash(to)
    }
  }

  return (
    <a href={`#${getRoutePath(to)}`} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

export function useNavigate(): (to: AppRouteId | number) => void {
  return (to) => {
    if (typeof to === 'number') {
      window.history.go(to)
      return
    }

    setRouteHash(to)
  }
}
