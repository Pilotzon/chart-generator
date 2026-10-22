import { Modals } from './components/modals/Modals.jsx';
import { Toasts } from './components/modals/Toasts.jsx';
import { Preview } from './components/preview/Preview.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { SelectionToolbar } from './components/richtext/SelectionToolbar.jsx';
import { AppProvider } from './context/AppContext.jsx';

export default function App() {
    return (
        <AppProvider>
            <Sidebar />
            <Preview />
            <Modals />
            <Toasts />
            <SelectionToolbar />
        </AppProvider>
    );
}
