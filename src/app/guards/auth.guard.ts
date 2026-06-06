import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';

export const authGuard: CanActivateFn = () => {
  const wallet = inject(WalletService);
  const router = inject(Router);
  if (wallet.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};
