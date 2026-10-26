import { getIconComponent } from './config'

function IconComponent(type: string, className?: string) {
  const Icon = getIconComponent()
  return (
    <Icon type={`icon-${type}`} className={className} />
  )
}

export default IconComponent;
