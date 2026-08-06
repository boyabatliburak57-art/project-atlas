import { Link } from 'expo-router';
import { Text } from 'react-native';
import { FoundationScreen } from '../src/components/foundation-screen';

export default function NotFoundRoute() {
  return (
    <FoundationScreen title="Route unavailable">
      <Link href="/">
        <Text>Return safely</Text>
      </Link>
    </FoundationScreen>
  );
}
