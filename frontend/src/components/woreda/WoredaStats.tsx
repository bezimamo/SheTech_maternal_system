'use client';

import React from 'react';
import Link from 'next/link';

interface Mother {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'DELIVERED' | 'INACTIVE';
  highRisk: boolean;
}

interface Child {
  _id: string;
  verified: boolean;
  registrationTimestamp: string;
}

interface Facility {
  _id: string;
  type: 'HOSPITAL' | 'HEALTH_CENTER';
}

interface WoredaStatsProps {
  mothers: Mother[];
  children: Child[];
  facilities: Facility[];
}

export function WoredaStats({ mothers, children, facilities }: WoredaStatsProps) {
  // Calculate statistics
  const totalMothers = mothers.length;
  const activeMothers = mothers.filter(m => m.status === 'ACTIVE').length;
  const deliveredMothers = mothers.filter(m => m.status === 'DELIVERED').length;
  const highRiskMothers = mothers.filter(m => m.highRisk).length;
  
  const totalBirths = children.length;
  const verifiedChildren = children.filter(c => c.verified).length;
  const pendingVerification = children.filter(c => !c.verified).length;
  
  const totalHospitals = facilities.filter(f => f.type === 'HOSPITAL').length;
  const totalHealthCenters = facilities.filter(f => f.type === 'HEALTH_CENTER').length;
  
  // Recent births (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBirths = children.filter(c => 
    new Date(c.registrationTimestamp) >= thirtyDaysAgo
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Mothers Card */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Mothers</p>
            <p className="text-2xl font-bold text-gray-900">{totalMothers}</p>
            <div className="text-xs text-gray-500 mt-1">
              {activeMothers} active · {deliveredMothers} delivered
            </div>
          </div>
        </div>
      </div>

      {/* Total Births Card */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Registered Children</p>
            <p className="text-2xl font-bold text-gray-900">{totalBirths}</p>
            <div className="text-xs text-gray-500 mt-1">
              {recentBirths} in last 30 days
            </div>
          </div>
        </div>
      </div>

      {/* Hospitals Card */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
        <div className="flex items-center">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Hospitals</p>
            <p className="text-2xl font-bold text-gray-900">{totalHospitals}</p>
            <div className="text-xs text-gray-500 mt-1">
              in this woreda
            </div>
          </div>
        </div>
      </div>

      {/* Health Centers Card */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
        <div className="flex items-center">
          <div className="p-2 bg-teal-100 rounded-lg">
            <svg className="h-6 w-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Health Centers</p>
            <p className="text-2xl font-bold text-gray-900">{totalHealthCenters}</p>
            <div className="text-xs text-gray-500 mt-1">
              in this woreda
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status Card — full width */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500 md:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Birth Certificate Status</p>
              <div className="flex items-center gap-6 mt-1">
                <span className="text-sm"><span className="font-bold text-green-600 text-lg">{verifiedChildren}</span> <span className="text-gray-500">issued</span></span>
                <span className="text-sm"><span className="font-bold text-yellow-600 text-lg">{pendingVerification}</span> <span className="text-gray-500">pending</span></span>
                <span className="text-sm"><span className="font-bold text-gray-700 text-lg">{totalBirths}</span> <span className="text-gray-500">total</span></span>
              </div>
            </div>
          </div>
          <Link href="/woreda-dashboard/birth-certificates"
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 whitespace-nowrap">
            📄 Manage Certificates
          </Link>
        </div>
      </div>

      {/* High Risk Mothers Alert */}
      {highRiskMothers > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 lg:col-span-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-800">High Risk Mothers Alert</p>
              <p className="text-lg font-bold text-red-900">{highRiskMothers} mothers require immediate attention</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
