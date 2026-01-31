import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/utils/helpers'

export default function AnimatedSection({ 
  children, 
  className, 
  animation = 'fade-in-up',
  delay = 0,
  threshold = 0.1 
}) {
  const [ref, isVisible] = useScrollAnimation({ threshold, once: true })

  const animationClasses = {
    'fade-in-up': 'animate-fade-in-up',
    'fade-in-down': 'animate-fade-in-down',
    'fade-in-left': 'animate-fade-in-left',
    'fade-in-right': 'animate-fade-in-right',
    'scale-in': 'animate-scale-in',
    'rotate-in': 'animate-rotate-in',
    'bounce-in': 'animate-bounce-in',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'reveal',
        isVisible && animationClasses[animation],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

