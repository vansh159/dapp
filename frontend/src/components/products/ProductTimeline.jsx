import { format } from 'date-fns'

const ProductTimeline = ({ history }) => {
  const getStatusIcon = (status) => {
    const icons = {
      'Produced': '🌱',
      'InTransit': '🚛',
      'Distributed': '🏭',
      'Retail': '🏪',
      'Sold': '🛒',
      'Recalled': '⚠️',
    }
    return icons[status] || '📦'
  }

  const getStatusColor = (status) => {
    const colors = {
      'Produced': 'bg-blue-500',
      'InTransit': 'bg-yellow-500',
      'Distributed': 'bg-purple-500',
      'Retail': 'bg-orange-500',
      'Sold': 'bg-green-500',
      'Recalled': 'bg-red-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No history available for this product.
      </div>
    )
  }

  return (
    <div className="timeline">
      {history.map((entry, index) => (
        <div key={index} className="timeline-item">
          <div className="flex items-start space-x-4">
            {/* Timeline Dot */}
            <div className="flex-shrink-0 relative">
              <div className={`w-8 h-8 rounded-full ${getStatusColor(entry.status)} flex items-center justify-center text-white text-sm font-medium`}>
                {getStatusIcon(entry.status)}
              </div>
              {index < history.length - 1 && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-16 bg-gray-200"></div>
              )}
            </div>

            {/* Timeline Content */}
            <div className="flex-1 min-w-0 pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {entry.status}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {entry.location}
                  </p>
                  {entry.notes && (
                    <p className="text-sm text-gray-500 mt-1">
                      {entry.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(entry.timestamp), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(entry.timestamp), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Actor Information */}
              {entry.actor && (
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span>Updated by: </span>
                  <code className="ml-1 bg-gray-100 px-1 py-0.5 rounded">
                    {entry.actor.slice(0, 6)}...{entry.actor.slice(-4)}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProductTimeline