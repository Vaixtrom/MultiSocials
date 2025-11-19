import { LucideProps } from 'lucide-react';
import { DiscordIcon, WhatsAppIcon, MessengerIcon, TelegramIcon, InstagramIcon } from './icons';

export interface Service {
    id: string;
    name: string;
    url: string;
    icon: React.FC<LucideProps>;
    color: string;
}

export const availableServices: Service[] = [
    {
        id: 'discord',
        name: 'Discord',
        url: 'https://discord.com/app',
        icon: DiscordIcon,
        color: '#5865F2'
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        url: 'https://web.whatsapp.com',
        icon: WhatsAppIcon,
        color: '#25D366'
    },
    {
        id: 'messenger',
        name: 'Messenger',
        url: 'https://www.messenger.com',
        icon: MessengerIcon,
        color: '#00B2FF'
    },
    {
        id: 'telegram',
        name: 'Telegram',
        url: 'https://web.telegram.org',
        icon: TelegramIcon,
        color: '#0088cc'
    },
    {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/direct/inbox/',
        icon: InstagramIcon,
        color: '#E4405F'
    }
];
