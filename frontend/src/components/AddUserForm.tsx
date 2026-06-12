'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export interface UserForEdit {
  _id: string;
  name: string;
  email: string;
  role: string;
  hospitalId?: string | { _id?: string; name?: string } | null;
  woredaId?: string | { _id?: string; name?: string; regionId?: any } | null;
  regionId?: string | { _id?: string; name?: string } | null;
  phoneNumber?: string;
}

interface AddUserFormProps {
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: UserForEdit;
  allowedRoles?: string[];
  hideHospitalSelect?: boolean;
  fixedHospitalId?: string;
}

interface FormValues {
  email: string;
  password: string;
  name: string;
  role: string;
  hospitalId: string;
  woredaId: string;
  regionId: string;
  phoneNumber: string;
}

// Roles that need a facility assignment
const FACILITY_ROLES = [
  'HOSPITAL_ADMIN','HEALTH_CENTER_ADMIN','DOCTOR','NURSE','MIDWIFE',
  'DISPATCHER','LIAISON_OFFICER','HOSPITAL_APPROVER','GATEKEEPER','SPECIALIST',
];

// Roles that are national-level — no woreda needed
const NATIONAL_ROLES = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'MOH_ADMIN'];

// Roles that need a woreda but NOT a facility
const WOREDA_ONLY_ROLES = ['WOREDA_ADMIN'];

function extractId(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return (v as any)?._id?.toString() ?? '';
}

function toRegionId(rid: any): string {
  if (!rid) return '';
  if (typeof rid === 'object') return rid._id?.toString() ?? rid.toString();
  return rid.toString();
}

export function AddUserForm({
  onClose, onSuccess, userToEdit, allowedRoles, hideHospitalSelect, fixedHospitalId,
}: AddUserFormProps) {
  const { user: authUser } = useAuth();

  const isFacilityAdmin = authUser?.role === 'HOSPITAL_ADMIN' || authUser?.role === 'HEALTH_CENTER_ADMIN';
  const isNationalAdmin = authUser?.role === 'SUPER_ADMIN' || authUser?.role === 'SYSTEM_ADMIN' || authUser?.role === 'MOH_ADMIN';

  const [form, setForm] = useState<FormValues>({
    email: '', password: '', name: '',
    role: allowedRoles?.[0] ?? 'DOCTOR',
    hospitalId: fixedHospitalId ?? (isFacilityAdmin ? (authUser?.hospitalId ?? '') : ''),
    woredaId:   isFacilityAdmin ? (authUser?.woredaId ?? '') : '',
    regionId:   '',
    phoneNumber: '',
  });

  const [woredas,  setWoredas]  = useState<any[]>([]);
  const [regions,  setRegions]  = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.getWoredas().catch(() => []),
      api.getRegions().catch(() => []),
      api.getHospitals().catch(() => []),
    ]).then(([w, r, h]) => {
      setWoredas(Array.isArray(w) ? w : []);
      setRegions(Array.isArray(r) ? r : []);
      setHospitals(Array.isArray(h) ? h : []);
    });
  }, []);

  // Pre-fill when editing
  useEffect(() => {
    if (!userToEdit) return;
    setForm({
      email:       userToEdit.email || '',
      password:    '',
      name:        userToEdit.name  || '',
      role:        userToEdit.role  || (allowedRoles?.[0] ?? 'DOCTOR'),
      hospitalId:  fixedHospitalId ?? extractId(userToEdit.hospitalId),
      woredaId:    extractId(userToEdit.woredaId),
      regionId:    extractId(userToEdit.regionId),
      phoneNumber: userToEdit.phoneNumber ?? '',
    });
  }, [userToEdit, fixedHospitalId, allowedRoles]);

  // When woredaId changes, auto-fill regionId from the woreda object
  useEffect(() => {
    if (!form.woredaId || woredas.length === 0) return;
    const w = woredas.find((x: any) => x._id?.toString() === form.woredaId);
    if (w) {
      const rid = toRegionId(w.regionId);
      if (rid && rid !== form.regionId) {
        setForm(prev => ({ ...prev, regionId: rid }));
      }
    }
  }, [form.woredaId, woredas]);

  // Derived
  const isNationalRole  = NATIONAL_ROLES.includes(form.role);
  const isFacilityRole  = FACILITY_ROLES.includes(form.role);
  const isWoredaOnly    = WOREDA_ONLY_ROLES.includes(form.role);
  const needsWoreda     = !isNationalRole; // everyone except SUPER/SYSTEM/MOH needs a woreda
  const needsFacility   = isFacilityRole && !hideHospitalSelect && !fixedHospitalId && !isFacilityAdmin;

  // Woredas filtered by nothing (show all with region label)
  const woredaLabel = (w: any) => {
    const regionName = w.regionId?.name
      || regions.find((r: any) => r._id?.toString() === toRegionId(w.regionId))?.name
      || '';
    return regionName ? `${w.name} — ${regionName}` : w.name;
  };

  // Facilities filtered by selected woreda
  const filteredFacilities = form.woredaId
    ? hospitals.filter((h: any) => {
        const wid = h.woredaId?._id?.toString() ?? h.woredaId?.toString() ?? '';
        return wid === form.woredaId;
      })
    : hospitals;

  const facilityOptions = form.role === 'HEALTH_CENTER_ADMIN'
    ? filteredFacilities.filter((h: any) => h.type === 'HEALTH_CENTER')
    : filteredFacilities;

  const selectedWoreda = woredas.find((w: any) => w._id?.toString() === form.woredaId);
  const selectedRegionName = form.regionId
    ? (regions.find((r: any) => r._id?.toString() === form.regionId)?.name
       || selectedWoreda?.regionId?.name || '')
    : '';

  const handleWoredaChange = (woredaId: string) => {
    setForm(prev => ({ ...prev, woredaId, hospitalId: '', regionId: '' }));
  };

  const handleHospitalChange = (hospitalId: string) => {
    const h = hospitals.find((x: any) => x._id?.toString() === hospitalId);
    const wid = h?.woredaId?._id?.toString() ?? h?.woredaId?.toString() ?? '';
    setForm(prev => ({ ...prev, hospitalId, woredaId: wid || prev.woredaId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (form.phoneNumber) {
        const valid = /^(09\d{8}|07\d{8}|\+2519\d{8}|\+2517\d{8}|2519\d{8}|2517\d{8})$/.test(form.phoneNumber);
        if (!valid) {
          setError('Phone must be a valid Ethiopian number: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX');
          setLoading(false);
          return;
        }
      }

      const payload: any = { ...form };

      // Facility admins: force their own context
      if (isFacilityAdmin) {
        payload.hospitalId = authUser?.hospitalId;
        payload.woredaId   = authUser?.woredaId;
      }

      // Fixed hospital always wins
      if (fixedHospitalId) payload.hospitalId = fixedHospitalId;

      // National roles: strip woreda/hospital
      if (isNationalRole) {
        delete payload.woredaId;
        delete payload.hospitalId;
      }

      // Non-facility roles: strip hospitalId
      if (!isFacilityRole) delete payload.hospitalId;

      // Strip empty strings
      if (!payload.woredaId)   delete payload.woredaId;
      if (!payload.hospitalId) delete payload.hospitalId;
      if (!payload.regionId)   delete payload.regionId;
      if (!payload.password)   delete payload.password;
      if (!payload.phoneNumber) delete payload.phoneNumber;

      if (userToEdit?._id) {
        await api.updateUser(userToEdit._id, payload);
      } else {
        await api.createUser(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const defaultRoles = [
    'SYSTEM_ADMIN','WOREDA_ADMIN','HOSPITAL_ADMIN','HEALTH_CENTER_ADMIN',
    'DOCTOR','LIAISON_OFFICER','HOSPITAL_APPROVER','SPECIALIST',
    'GATEKEEPER','NURSE','MIDWIFE','DISPATCHER','EMERGENCY_ADMIN',
  ];
  const roles = allowedRoles?.length ? allowedRoles : defaultRoles;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-bold mb-5 text-gray-900">
          {userToEdit ? 'Edit User' : 'Add New User'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" required value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {userToEdit ? <span className="text-gray-400 font-normal">(leave blank to keep)</span> : <span className="text-red-500">*</span>}
            </label>
            <input type="password" required={!userToEdit} minLength={6} value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input type="text" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value, woredaId: '', hospitalId: '', regionId: '' }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              {roles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {/* ── National roles: no woreda needed ── */}
          {isNationalRole && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              ℹ️ {form.role.replace(/_/g,' ')} is a national-level role — no woreda or facility assignment needed.
            </div>
          )}

          {/* ── System admin region selection ── */}
          {form.role === 'SYSTEM_ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <select required value={form.regionId} onChange={e => setForm(p => ({ ...p, regionId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">— Select Region —</option>
                {regions.map((r: any) => (
                  <option key={r._id} value={r._id?.toString() ?? ''}>{r.name}</option>
                ))}
              </select>
              {regions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ No regions available. Create a region first.</p>
              )}
            </div>
          )}

          {/* ── Woreda selection (all non-national roles) ── */}
          {needsWoreda && !isFacilityAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Woreda <span className="text-red-500">*</span>
              </label>
              <select required value={form.woredaId} onChange={e => handleWoredaChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">— Select Woreda —</option>
                {woredas.map((w: any) => (
                  <option key={w._id} value={w._id?.toString() ?? ''}>{woredaLabel(w)}</option>
                ))}
              </select>
              {/* Auto-filled region confirmation */}
              {form.woredaId && selectedRegionName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span>✓</span>
                  <span>Region <strong>{selectedRegionName}</strong> auto-assigned from selected woreda</span>
                </div>
              )}
              {form.woredaId && !selectedRegionName && (
                <p className="text-xs text-amber-600 mt-1">⚠ This woreda has no region assigned</p>
              )}
            </div>
          )}

          {/* ── Facility selection (facility-scoped roles) ── */}
          {needsFacility && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.role === 'HEALTH_CENTER_ADMIN' ? 'Health Center' : 'Hospital / Facility'} <span className="text-red-500">*</span>
                {form.woredaId && selectedRegionName && (
                  <span className="ml-2 text-xs font-normal text-blue-600">in {selectedRegionName}</span>
                )}
              </label>
              <select required value={form.hospitalId}
                onChange={e => handleHospitalChange(e.target.value)}
                disabled={!form.woredaId}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="">{!form.woredaId ? '← Select a woreda first' : '— Select Facility —'}</option>
                {facilityOptions.map((h: any) => (
                  <option key={h._id} value={h._id?.toString() ?? ''}>
                    {h.name} {h.type === 'HEALTH_CENTER' ? '(Health Center)' : '(Hospital)'}
                  </option>
                ))}
              </select>
              {form.woredaId && facilityOptions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ No facilities found in this woreda</p>
              )}
            </div>
          )}

          {/* ── Facility admin: auto-assign info ── */}
          {isFacilityAdmin && isFacilityRole && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              🏥 Facility, woreda and region will be auto-assigned from your account.
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="text" value={form.phoneNumber} maxLength={13}
              onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
              placeholder="09XXXXXXXX or 07XXXXXXXX"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <p className="text-xs text-gray-400 mt-1">Ethiopian format: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              Cancel
            </button>
            {userToEdit && (
              <button type="button"
                onClick={async () => {
                  if (!userToEdit?._id) return;
                  if (!window.confirm('Delete this user permanently?')) return;
                  setLoading(true);
                  try { await api.deleteUser(userToEdit._id); onSuccess(); onClose(); }
                  catch (err: any) { setError(err?.message || 'Failed to delete'); setLoading(false); }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                Delete User
              </button>
            )}
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
              {loading ? (userToEdit ? 'Saving…' : 'Creating…') : (userToEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
