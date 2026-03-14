interface TabNavigationProps {
  activeTab: 'orders' | 'payments' | 'settlement' | 'reconciliation';
  onTabChange: (tab: 'orders' | 'payments' | 'settlement' | 'reconciliation') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'settlement', label: 'Settlement', icon: '🏦' },
    { id: 'reconciliation', label: 'Reconciliation'}
  ] as const;

  return (
    <div className="tab-navigation">
      <div className="tab-navigation__container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
            onClick={() => onTabChange(tab.id as any)}
          >
            <span className="tab-button__label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
