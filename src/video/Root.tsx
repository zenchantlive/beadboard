import { Composition, Still } from 'remotion';
import { Main } from './Main';
import './style.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={810}
        fps={30}
        width={1920}
        height={1080}
      />
      <Still
        id="Thumbnail"
        component={Main}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
