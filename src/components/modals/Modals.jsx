import { useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { IconTrash, IconWarning } from '../controls/Icons.jsx';

function Modal({ icon, danger, title, message, confirmLabel, confirmClass, onCancel, onConfirm }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);
    return (
        <div className="modal-overlay" style={{ display: 'flex' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="modal-card">
                <div className={`modal-icon ${danger ? 'modal-icon-danger' : ''}`}>{icon}</div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button type="button" className={`btn ${confirmClass}`} onClick={onConfirm} autoFocus>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

export function Modals() {
    const {
        state, actions, pendingMode, cancelModeChange, confirmModeChange,
        pendingDeleteChartId, setPendingDeleteChartId
    } = useApp();

    const deleting = state.charts.find(c => c.id === pendingDeleteChartId);

    return (
        <>
            {pendingMode && (
                <Modal
                    icon={<IconWarning />}
                    title={pendingMode === 'advanced' ? 'Switch to Advanced mode?' : 'Switch to Classic mode?'}
                    message={pendingMode === 'advanced'
                        ? 'Your Classic settings will be copied over as a starting point. You can safely switch back later — both modes are saved separately.'
                        : 'You will return to your saved Classic workspace. Any changes made in Advanced mode remain saved and will be restored when you switch back.'}
                    confirmLabel={pendingMode === 'advanced' ? 'Switch to Advanced' : 'Switch to Classic'}
                    confirmClass="btn-primary"
                    onCancel={cancelModeChange}
                    onConfirm={confirmModeChange}
                />
            )}
            {pendingDeleteChartId && (
                <Modal
                    danger
                    icon={<IconTrash />}
                    title="Delete chart?"
                    message={`"${deleting ? deleting.name : 'This chart'}" will be permanently deleted. This can't be undone.`}
                    confirmLabel="Delete"
                    confirmClass="btn-danger"
                    onCancel={() => setPendingDeleteChartId(null)}
                    onConfirm={() => { actions.deleteChart(pendingDeleteChartId); setPendingDeleteChartId(null); }}
                />
            )}
        </>
    );
}
