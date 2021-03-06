import { createState } from '@open-tech-world/react-state';

const useAppState = createState({});

export default function App() {
  const state = useAppState();

  return (
    <button
      onClick={() => {
        alert(JSON.stringify(state, null, 4));
      }}
    >
      Show State
    </button>
  );
}
