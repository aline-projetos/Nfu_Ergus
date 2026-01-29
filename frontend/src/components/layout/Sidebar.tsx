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

// ----- Tipos -----
interface GrandChildItem {
  label: string;
  path: string;
}

interface ChildItem {
  label: string;
  path?: string;
  children?: GrandChildItem[];
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: ChildItem[];
}

// ----- Menu -----
const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { 
    label: 'Catálogo', 
    icon: Package,
    children: [
      { label: 'Categorias', path: '/catalogo/categorias' },
      { 
        label: 'Variações',
        children: [
          { label: 'Tipos de Variações', path: '/catalogo/variacoes/tipos' },
          { label: 'Grade X', path: '/catalogo/variacoes/gradex' },
          { label: 'Grade Y', path: '/catalogo/variacoes/gradey' },
        ],
      },
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
  const [expandedSubItems, setExpandedSubItems] = useState<string[]>([]); // para Variações

  const user = localStorage.getItem('ergus_user');
  const userType = user ? JSON.parse(user).type : null;
  const userName = user ? JSON.parse(user).name : null;

  const isAdmin = (userType || '').toLowerCase() === 'admin';
  const isSupervisor = (userName || '').toLowerCase() === 'supervisor';

  const isActive = (path: string) => location.pathname === path;

  const isParentActive = (children?: ChildItem[]) => 
    children?.some(child => {
      // se o item tiver path direto
      if (child.path && location.pathname.startsWith(child.path)) {
        return true;
      }

      // se o item tiver submenu (netos)
      if (child.children) {
        return child.children.some(grand =>
          location.pathname.startsWith(grand.path)
        );
      }

      return false;
    });

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const toggleSubExpand = (parentLabel: string, childLabel: string) => {
    const key = `${parentLabel}:${childLabel}`;
    setExpandedSubItems(prev =>
      prev.includes(key)
        ? prev.filter(item => item !== key)
        : [...prev, key]
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
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src="/ergus_sem_fundo.png"
            alt="erGus ERP"
            className="h-16 w-auto"
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
                      {item.children.map((child) => {
                        const hasGrandchildren = !!child.children?.length;
                        const subKey = `${item.label}:${child.label}`;

                        if (hasGrandchildren) {
                          // Item com submenu (ex: Variações)
                          return (
                            <li key={child.label}>
                              <button
                                onClick={() => toggleSubExpand(item.label, child.label)}
                                className="sidebar-subitem w-full justify-between pl-8"
                              >
                                <span>{child.label}</span>
                                {expandedSubItems.includes(subKey) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>

                              {expandedSubItems.includes(subKey) && (
                                <ul className="mt-1 space-y-1">
                                  {child.children!.map((grand) => (
                                    <li key={grand.path}>
                                      <Link
                                        to={grand.path}
                                        className={`sidebar-subitem pl-14 ${
                                          isActive(grand.path) ? 'active' : ''
                                        }`}
                                      >
                                        {grand.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        }

                        // Item normal (sem submenu)
                        return (
                          <li key={child.path ?? child.label}>
                            {child.path ? (
                              <Link
                                to={child.path}
                                className={`sidebar-subitem pl-8 ${
                                  isActive(child.path) ? 'active' : ''
                                }`}
                              >
                                {child.label}
                              </Link>
                            ) : (
                              <span className="sidebar-subitem pl-8">{child.label}</span>
                            )}
                          </li>
                        );
                      })}

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
