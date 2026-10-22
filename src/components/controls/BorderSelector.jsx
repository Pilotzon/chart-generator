import { EdgeSketch } from './Sketches.jsx';

/**
 * Side toggles (Top / Right / Bottom / Left) drawn as the edges of a little chart frame.
 * `prefix` + side name is the state key, e.g. prefix="border" → borderTop.
 */
export function BorderSelector(props) {
    return <EdgeSketch {...props} />;
}
