import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ChevronDown, 
  ChevronRight,
  Receipt,
  ShoppingCart,
  BarChart3,
  FolderCog,
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
      { label: 'Fornecedores', path: '/catalogo/fornecedores' },
      { label: 'Fabricantes', path: '/catalogo/fabricantes' },
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

  const user = localStorage.getItem('ergus_user');
  const userType = user ? JSON.parse(user).type : null;
  const userName = user ? JSON.parse(user).name : null;

  const isAdmin = (userType || '').toLowerCase() === 'admin';
  const isSupervisor = (userName || '').toLowerCase() === 'supervisor';

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

  // 1) Se não for admin, remove o menu "Cadastros" inteiro
  let filteredMenuItems: MenuItem[] = menuItems;

  if (!isAdmin) {
    filteredMenuItems = menuItems.filter(item => item.label !== 'Cadastros');
  } else {
    // 2) Se for admin, aplica a regra de "Clientes" só para supervisor
    filteredMenuItems = menuItems.map((item) => {
      if (item.label === 'Cadastros' && item.children) {
        const filteredChildren = item.children.filter(child => {
          if (child.label === 'Clientes' && !isSupervisor) {
            return false; // esconde Clientes se não for supervisor
          }
          return true;
        });

        return {
          ...item,
          children: filteredChildren,
        };
      }

      return item;
    });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-50">
            {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src="/logo_erGus.png"
            alt="erGus ERP"
            className="h-8 w-auto"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => (
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
                  
                  {expandedItems.includes(item.label) && item.children && item.children.length > 0 && (
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
