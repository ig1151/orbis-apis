import axios from 'axios';

export async function isShopify(hostname: string): Promise<boolean> {
  try {
    await axios.get('https://' + hostname + '/meta.json', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
