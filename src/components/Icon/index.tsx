import { createFromIconfontCN } from '@ant-design/icons';

const Icon = createFromIconfontCN({
  scriptUrl: 'https://at.alicdn.com/t/c/font_5241307_xoojyr52dqn.js',
});

function IconComponent(type: string, className?: string) {
  return (
    <Icon type={`icon-${type}`} className={className} />
  )
}

export default IconComponent;