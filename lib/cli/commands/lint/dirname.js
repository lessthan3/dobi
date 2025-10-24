import { fileURLToPath } from 'url';
import { dirname } from 'path';

export default dirname(fileURLToPath(import.meta.url));
