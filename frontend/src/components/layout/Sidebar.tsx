import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ChevronDown, 
  ChevronRight,
  Tags,
  Box,
  Receipt,
  ShoppingCart,
  BarChart3,
  FolderCog,
  Users,
  UserCog
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { 
    label: 'Catálogo', 
    icon: Package,
    children: [
      { label: 'Categorias', path: '/catalogo/categorias' },
      { label: 'Produtos', path: '/catalogo/produtos' },
      { label: 'Promoções', path: '/catalogo/promocoes' },
    ]
  },
  { 
    label: 'Cadastros', 
    icon: FolderCog,
    children: [
      { label: 'Clientes', path: '/cadastros/admin/clientes' },
      { label: 'Usuários', path: '/cadastros/admin/usuarios' },
    ]
  },
  { label: 'Fiscal', icon: Receipt, path: '/fiscal' },
  { label: 'Vendas', icon: ShoppingCart, path: '/vendas' },
  { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
];

export function Sidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Catálogo']);

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (children?: { path: string }[]) => 
    children?.some(child => location.pathname.startsWith(child.path));

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-semibold text-sidebar-foreground">
            er<span className="text-sidebar-primary">Gus</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.label}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`sidebar-item w-full justify-between ${
                      isParentActive(item.children) ? 'text-sidebar-foreground' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {expandedItems.includes(item.label) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {expandedItems.includes(item.label) && (
                    <ul className="mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <Link
                            to={child.path}
                            className={`sidebar-subitem ${
                              isActive(child.path) ? 'active' : ''
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path!}
                  className={`sidebar-item ${isActive(item.path!) ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-muted text-center">
          © 2026 erGus ERP
        </p>
      </div>
    </aside>
  );
}
