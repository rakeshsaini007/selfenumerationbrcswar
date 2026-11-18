export interface KarmikRow {
  id: string;
  karmikName: string;
  designation: string;
  officeName: string;
  departmentName: string;
  ehrmsCode: string;
  mukhiyaName: string;
  fatherHusbandName: string;
  mobileNumber: string;
  village: string;
  seId: string;
  selfEnumDate: string;
  enumeratedBy: string;
}

export interface ExistingKarmikRecord extends Omit<KarmikRow, 'id'> {
  rowIndex?: number;
}

export interface SchoolLookupResponse {
  success: boolean;
  error?: string;
  udiseCode: string;
  foundInSchoolList: boolean;
  schoolName: string;
  hasExistingData: boolean;
  headmasterName: string;
  headmasterMobile: string;
  existingRecords: ExistingKarmikRecord[];
}

export interface SchoolDirectoryItem {
  udiseCode: string;
  schoolName: string;
}

export interface SaveUpdatePayload {
  action: 'save' | 'update';
  mode: 'save' | 'update';
  udiseCode: string;
  schoolName: string;
  headmasterName: string;
  headmasterMobile: string;
  rows: Omit<KarmikRow, 'id'>[];
}

export interface SaveUpdateResponse {
  success: boolean;
  mode?: 'save' | 'update';
  savedCount?: number;
  message?: string;
  error?: string;
}

export interface AlertDialogState {
  open: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export const KARMIK_TABLE_COLUMNS: {
  key: keyof Omit<KarmikRow, 'id'>;
  label: string;
  placeholder: string;
  type?: 'text' | 'tel' | 'date';
  mono?: boolean;
  minWidth: string;
  maxLength?: number;
}[] = [
  {
    key: 'karmikName',
    label: 'कार्मिक का नाम',
    placeholder: 'कार्मिक का पूरा नाम',
    minWidth: 'min-w-[180px]',
  },
  {
    key: 'designation',
    label: 'पद नाम',
    placeholder: 'जैसे: सहायक अध्यापक',
    minWidth: 'min-w-[165px]',
  },
  {
    key: 'officeName',
    label: 'कार्यालय का नाम',
    placeholder: 'कार्यालय / विद्यालय',
    minWidth: 'min-w-[175px]',
  },
  {
    key: 'departmentName',
    label: 'विभाग का नाम',
    placeholder: 'बेसिक शिक्षा विभाग',
    minWidth: 'min-w-[165px]',
  },
  {
    key: 'ehrmsCode',
    label: 'EHRMS CODE',
    placeholder: 'EHRMS कोड',
    mono: true,
    minWidth: 'min-w-[135px]',
  },
  {
    key: 'mukhiyaName',
    label: 'मुखिया का नाम',
    placeholder: 'परिवार के मुखिया का नाम',
    minWidth: 'min-w-[170px]',
  },
  {
    key: 'fatherHusbandName',
    label: 'पिता/पति का नाम',
    placeholder: 'पिता या पति का नाम',
    minWidth: 'min-w-[170px]',
  },
  {
    key: 'mobileNumber',
    label: 'मोबाइल नंबर',
    placeholder: '10 अंकों का मोबाइल',
    type: 'tel',
    mono: true,
    minWidth: 'min-w-[140px]',
    maxLength: 10,
  },
  {
    key: 'village',
    label: 'ग्राम',
    placeholder: 'ग्राम का नाम',
    minWidth: 'min-w-[145px]',
  },
  {
    key: 'seId',
    label: 'स्व गणना आइडी(SE ID)',
    placeholder: 'P12345678945',
    mono: true,
    minWidth: 'min-w-[165px]',
    maxLength: 12,
  },
  {
    key: 'selfEnumDate',
    label: 'स्व गणना दिनांक',
    placeholder: 'YYYY-MM-DD',
    type: 'date',
    mono: true,
    minWidth: 'min-w-[155px]',
  },
  {
    key: 'enumeratedBy',
    label: 'स्व गणना किसके द्वारा की गई',
    placeholder: 'स्वयं / अन्य का नाम',
    minWidth: 'min-w-[190px]',
  },
];

export function createEmptyKarmikRow(defaultOfficeName = ''): KarmikRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    karmikName: '',
    designation: '',
    officeName: defaultOfficeName,
    departmentName: 'बेसिक शिक्षा विभाग',
    ehrmsCode: '',
    mukhiyaName: '',
    fatherHusbandName: '',
    mobileNumber: '',
    village: '',
    seId: '',
    selfEnumDate: '',
    enumeratedBy: '',
  };
}
