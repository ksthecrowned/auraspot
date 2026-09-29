import Logo from '@/public/logo.png';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthNavbar() {
  return (
    <div className="container absolute top-6 flex md:top-10">
      <Link className="mr-auto" href="/">
        <Image
          src={Logo}
          alt="AuraSpot"
          width={50}
          height={50}
          loading="eager"
        />
      </Link>
    </div>
  );
}
