import { LayoutDashboard, TrendingUp, Package, ShoppingCart, Users } from 'lucide-react';

const stats = [
  { label: 'Vendas Hoje', value: 'R$ 12.450,00', icon: TrendingUp, change: '+12%' },
  { label: 'Produtos Ativos', value: '1.234', icon: Package, change: '+5%' },
  { label: 'Pedidos Pendentes', value: '45', icon: ShoppingCart, change: '-3%' },
  { label: 'Clientes Novos', value: '89', icon: Users, change: '+18%' },
];

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card-dashboard p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-success' : 'text-destructive'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-semibold text-foreground mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 card-dashboard p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Bem-vindo ao erGus ERP</h2>
        <p className="text-muted-foreground">
          Gerencie seu negócio de forma eficiente com nosso sistema integrado de gestão empresarial.
          Navegue pelo menu lateral para acessar as funcionalidades do sistema.
        </p>
      </div>
    </div>
  );
}
