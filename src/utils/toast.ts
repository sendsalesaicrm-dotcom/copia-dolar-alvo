import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string) => {
  // Use a persistent toast without the default loading spinner.
  return toast(message, { duration: Infinity });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};