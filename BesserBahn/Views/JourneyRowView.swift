//
//  JourneyRowView.swift
//  BesserBahn
//
//  Created by Vincent Borko on 19.08.25.
//


import SwiftUI

struct JourneyRowView: View {
    let journey: Journey
    let isRecommended: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(journey.route)
                        .font(.headline)
                    if isRecommended {
                        Text("BEST")
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(4)
                    }
                }
                
                Text(journey.details)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack {
                    Text(journey.duration)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if journey.connections > 0 {
                        Text("• \(journey.connections) connection\(journey.connections == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing) {
                Text("€\(journey.price, specifier: "%.2f")")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(isRecommended ? .green : .primary)
            }
        }
        .background(isRecommended ? Color.green.opacity(0.1) : Color.clear)
        .padding(.vertical, 8)
        .cornerRadius(8)
    }
}
