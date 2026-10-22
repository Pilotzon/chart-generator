import { useApp } from '../../context/AppContext.jsx';

export function Toasts() {
    const { toasts } = useApp();
    return (
        <div id="toastHost">
            {toasts.map(t => (
                <div className="toast" key={t.id} role="status">
                    <div className="toast-body"><p className="toast-msg" style={{ margin: 0 }}>{t.message}</p></div>
                </div>
            ))}
        </div>
    );
}
