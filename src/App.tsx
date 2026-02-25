import { signInWithPopup } from "firebase/auth";
import { useAtomValue } from "jotai";
import { auth, provider } from "./firebase";
import { useHistory } from "./hooks/useHistory";
import { TopBanner } from "./TopBanner";
import { Board } from "./Board";
import { ContextMenu } from "./ContextMenu";
import { AppSettingsMenu } from "./AppSettingsMenu";
import { Login } from "./Login";
import { SnapshotDialog } from "./modals/SnapshotDialog";
import { CategoryManagementDialog } from "./modals/CategoryManagementDialog";
import { ImportExportDialog } from "./modals/ImportExportDialog";
import { AddToCategoryDialog } from "./modals/AddToCategoryDialog";
import { CustomColorsDialog } from "./modals/CustomColorDialog";
import { DueDateDialog } from "./modals/DueDateDialog";
import { WorkerOrderDialog } from "./modals/WorkerOrderDialog";
import {
  AddWorkerDialog,
  EditWorkerDialog,
  DeleteWorkerDialog,
} from "./modals/WorkerModals";
import {
  userAtom,
  darkModeSyncEffect,
  boardDataSyncEffect,
  categoriesSyncEffect,
  locksSyncEffect,
  presenceSyncEffect,
  customPaletteSyncEffect,
  darkModeDomEffect,
  snapshotsLoginSyncEffect,
  dragOriginEffect,
} from "./atoms";

export default function App() {
  const user = useAtomValue(userAtom);

  // Sync Effects
  useAtomValue(darkModeDomEffect);
  useAtomValue(darkModeSyncEffect);
  useAtomValue(boardDataSyncEffect);
  useAtomValue(categoriesSyncEffect);
  useAtomValue(locksSyncEffect);
  useAtomValue(presenceSyncEffect);
  useAtomValue(customPaletteSyncEffect);
  useAtomValue(snapshotsLoginSyncEffect);
  useAtomValue(dragOriginEffect);

  const { history, future, registerHistory, handleUndo, handleRedo } =
    useHistory();

  const handleLogin = () => {
    signInWithPopup(auth, provider);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div
      className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative"
      style={{ fontFamily: "Georgia, serif" }}
    >
      <ContextMenu />

      <AppSettingsMenu />

      <TopBanner
        history={history}
        future={future}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <Board
        onHistory={registerHistory}
      />

      {/* DIALOGS */}
      <DueDateDialog />
      <AddToCategoryDialog />
      <SnapshotDialog />
      <AddWorkerDialog />
      <WorkerOrderDialog />
      <EditWorkerDialog />
      <DeleteWorkerDialog />
      <CategoryManagementDialog />
      <CustomColorsDialog />
      <ImportExportDialog />
    </div>
  );
}
